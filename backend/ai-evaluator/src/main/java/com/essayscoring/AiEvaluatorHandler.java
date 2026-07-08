package com.essayscoring;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import okhttp3.*;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.GetParameterRequest;
import software.amazon.awssdk.services.ssm.model.GetParameterResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class AiEvaluatorHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {

    private static final String GEMINI_API_KEY_PARAM = System.getenv("GEMINI_API_KEY_PARAM");
    private static final String RESULT_BUCKET_NAME = System.getenv("RESULT_BUCKET_NAME");
    private static final Region REGION = Region.of(
            "true".equals(System.getenv("AWS_SAM_LOCAL")) ? "ap-southeast-1" :
            System.getenv("AWS_REGION") != null && !System.getenv("AWS_REGION").isBlank() ? System.getenv("AWS_REGION") : "ap-southeast-1"
    );
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

    private final SsmClient ssmClient;
    private final S3Client s3Client;
    private final OkHttpClient httpClient;
    private final Gson gson;

    public AiEvaluatorHandler() {
        this.ssmClient = SsmClient.builder()
                .region(REGION)
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
        this.s3Client = S3Client.builder()
                .region(REGION)
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
        this.httpClient = new OkHttpClient();
        this.gson = new Gson();
    }

    @Override
    public Map<String, Object> handleRequest(Map<String, Object> input, Context context) {
        try {
            String userId = (String) input.get("userId");
            String essayId = (String) input.get("essayId");
            String fileKey = (String) input.get("fileKey");
            
            String rawBucketName = System.getenv("RAW_BUCKET_NAME");
            if (rawBucketName == null || rawBucketName.isBlank()) {
                rawBucketName = (String) input.get("rawBucketName");
            }

            software.amazon.awssdk.services.s3.model.GetObjectRequest getObjectRequest = 
                    software.amazon.awssdk.services.s3.model.GetObjectRequest.builder()
                            .bucket(rawBucketName)
                            .key(fileKey)
                            .build();
                            
            String essayText = s3Client.getObject(getObjectRequest, 
                    software.amazon.awssdk.core.sync.ResponseTransformer.toBytes()).asUtf8String();

            String apiKey = getGeminiApiKey();
            String evaluationJson = evaluateEssay(essayText, apiKey);
            JsonObject evaluation = gson.fromJson(evaluationJson, JsonObject.class);

            String resultKey = "results/" + essayId + ".json";
            saveResultToS3(evaluation, resultKey);

            Map<String, Object> result = new HashMap<>();
            result.put("status", "success");
            result.put("score", evaluation.get("score").getAsInt());
            result.put("feedback", evaluation.get("feedback").getAsString());
            result.put("resultKey", resultKey);
            result.put("userId", userId);
            result.put("essayId", essayId);

            return result;

        } catch (Exception e) {
            context.getLogger().log("Error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Gemini API Error: " + e.getMessage(), e);
        }
    }

    private String getGeminiApiKey() {
        GetParameterRequest request = GetParameterRequest.builder()
                .name(GEMINI_API_KEY_PARAM)
                .withDecryption(true)
                .build();
        GetParameterResponse response = ssmClient.getParameter(request);
        return response.parameter().value();
    }

    private String evaluateEssay(String essayText, String apiKey) throws IOException {
        JsonObject requestBody = new JsonObject();
        JsonObject contents = new JsonObject();
        JsonObject part = new JsonObject();
        part.addProperty("text", buildPrompt(essayText));
        contents.add("parts", gson.toJsonTree(new JsonObject[]{part}));
        requestBody.add("contents", gson.toJsonTree(new JsonObject[]{contents}));

        Request request = new Request.Builder()
                .url(GEMINI_API_URL + "?key=" + apiKey)
                .post(RequestBody.create(requestBody.toString(), MediaType.parse("application/json")))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) throw new IOException("Unexpected code " + response);
            String responseBody = response.body().string();
            JsonObject jsonResponse = gson.fromJson(responseBody, JsonObject.class);
            String rawText = jsonResponse.getAsJsonArray("candidates")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("content")
                    .getAsJsonArray("parts")
                    .get(0).getAsJsonObject()
                    .get("text").getAsString();
            return cleanJsonResponse(rawText);
        }
    }

    private String cleanJsonResponse(String rawText) {
        rawText = rawText.trim();
        if (rawText.startsWith("```json")) {
            rawText = rawText.substring(7);
        } else if (rawText.startsWith("```")) {
            rawText = rawText.substring(3);
        }
        if (rawText.endsWith("```")) {
            rawText = rawText.substring(0, rawText.length() - 3);
        }
        return rawText.trim();
    }

    private String buildPrompt(String essayText) {
        return "You are an expert English teacher. Please evaluate the following essay and provide:\n" +
                "1. A score from 0 to 100\n" +
                "2. Detailed feedback on grammar, vocabulary, structure, and content\n\n" +
                "Essay:\n" + essayText + "\n\n" +
                "Format your response as JSON with 'score' (number) and 'feedback' (string) fields.";
    }

    private void saveResultToS3(JsonObject evaluation, String resultKey) {
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(RESULT_BUCKET_NAME)
                .key(resultKey)
                .contentType("application/json")
                .build();
        byte[] bytes = gson.toJson(evaluation).getBytes(StandardCharsets.UTF_8);
        software.amazon.awssdk.core.sync.RequestBody requestBody = software.amazon.awssdk.core.sync.RequestBody.fromBytes(bytes);
        s3Client.putObject(putRequest, requestBody);
    }
}
