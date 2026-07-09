package com.essayscoring;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class GetPresignedUrlHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    private static final String BUCKET_NAME = System.getenv("RAW_BUCKET_NAME");
    private static final Region REGION = Region.of(
            "true".equals(System.getenv("AWS_SAM_LOCAL")) ? "ap-southeast-1" :
            System.getenv("AWS_REGION") != null && !System.getenv("AWS_REGION").isBlank() ? System.getenv("AWS_REGION") : "ap-southeast-1"
    );

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final Gson gson;

    public GetPresignedUrlHandler() {
        this.s3Client = S3Client.builder()
                .region(REGION)
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
        this.s3Presigner = S3Presigner.builder()
                .region(REGION)
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
        this.gson = new Gson();
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent request, Context context) {
        try {
            JsonObject body = gson.fromJson(request.getBody(), JsonObject.class);
            String filename = null;
            if (body.has("filename") && !body.get("filename").isJsonNull()) {
                filename = body.get("filename").getAsString();
            } else if (body.has("fileName") && !body.get("fileName").isJsonNull()) {
                filename = body.get("fileName").getAsString();
            }
            
            if (filename == null || filename.isBlank()) {
                return new APIGatewayProxyResponseEvent()
                        .withStatusCode(400)
                        .withBody("{\"error\":\"Missing filename or fileName field\"}")
                        .withHeaders(getCorsHeaders());
            }
            
            String userId = AuthContextHelper.extractUserId(request, gson).orElse(null);
            if (userId == null || userId.isBlank()) {
                return new APIGatewayProxyResponseEvent()
                        .withStatusCode(401)
                        .withBody("{\"error\":\"Unauthorized\"}")
                        .withHeaders(getCorsHeaders());
            }

            String fileKey = UUID.randomUUID().toString() + "_" + filename;

            PutObjectRequest objectRequest = PutObjectRequest.builder()
                    .bucket(BUCKET_NAME)
                    .key(fileKey)
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15))
                    .putObjectRequest(objectRequest)
                    .build();

            String presignedUrl = s3Presigner.presignPutObject(presignRequest).url().toString();

            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("uploadUrl", presignedUrl);
            responseBody.put("fileKey", fileKey);

            return new APIGatewayProxyResponseEvent()
                    .withStatusCode(200)
                    .withBody(gson.toJson(responseBody))
                    .withHeaders(getCorsHeaders());

        } catch (Exception e) {
            context.getLogger().log("Error: " + e.getMessage());
            return new APIGatewayProxyResponseEvent()
                    .withStatusCode(500)
                    .withBody("{\"error\":\"" + e.getMessage() + "\"}")
                    .withHeaders(getCorsHeaders());
        }
    }

    private Map<String, String> getCorsHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        headers.put("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Mock-User-Id");
        return headers;
    }
}
