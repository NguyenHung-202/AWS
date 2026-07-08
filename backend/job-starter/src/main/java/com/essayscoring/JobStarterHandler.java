package com.essayscoring;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sfn.SfnClient;
import software.amazon.awssdk.services.sfn.model.StartExecutionRequest;

import java.util.UUID;

public class JobStarterHandler implements RequestHandler<SQSEvent, Void> {

    private static final String STATE_MACHINE_ARN = System.getenv("STATE_MACHINE_ARN");
    private static final String RAW_BUCKET_NAME = System.getenv("RAW_BUCKET_NAME");
    private static final Region REGION = Region.of(
            "true".equals(System.getenv("AWS_SAM_LOCAL")) ? "ap-southeast-1" :
            System.getenv("AWS_REGION") != null && !System.getenv("AWS_REGION").isBlank() ? System.getenv("AWS_REGION") : "ap-southeast-1"
    );

    private final SfnClient sfnClient;
    private final Gson gson;

    public JobStarterHandler() {
        this.sfnClient = SfnClient.builder()
                .region(REGION)
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
        this.gson = new Gson();
    }

    @Override
    public Void handleRequest(SQSEvent event, Context context) {
        for (SQSEvent.SQSMessage msg : event.getRecords()) {
            try {
                JsonObject body = gson.fromJson(msg.getBody(), JsonObject.class);
                String fileKey = getStringField(body, "fileKey");
                String userId = getStringField(body, "userId");
                String essayId = getStringField(body, "essayId");
                String filename = getStringField(body, "filename", "fileName");
                
                if (fileKey == null || userId == null || essayId == null || filename == null) {
                    context.getLogger().log("Missing required fields in SQS message");
                    continue;
                }

                JsonObject input = new JsonObject();
                input.addProperty("fileKey", fileKey);
                input.addProperty("userId", userId);
                input.addProperty("essayId", essayId);
                input.addProperty("filename", filename);
                input.addProperty("rawBucketName", RAW_BUCKET_NAME);

                StartExecutionRequest request = StartExecutionRequest.builder()
                        .stateMachineArn(STATE_MACHINE_ARN)
                        .name("essay-scoring-" + UUID.randomUUID())
                        .input(gson.toJson(input))
                        .build();

                sfnClient.startExecution(request);
                context.getLogger().log("Started Step Functions execution for: " + fileKey);

            } catch (Exception e) {
                context.getLogger().log("Error processing message: " + e.getMessage());
            }
        }
        return null;
    }

    private String getStringField(JsonObject json, String... fieldNames) {
        for (String fieldName : fieldNames) {
            if (json.has(fieldName) && !json.get(fieldName).isJsonNull()) {
                return json.get(fieldName).getAsString();
            }
        }
        return null;
    }
}
