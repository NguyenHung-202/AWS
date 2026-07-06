package com.essayscoring;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.time.Instant;
import java.util.*;

public class RouterStoreHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    private static final String DYNAMODB_TABLE = System.getenv("DYNAMODB_TABLE_NAME");
    private static final String SNS_TOPIC_ARN = System.getenv("SNS_TOPIC_ARN");
    private static final String SQS_QUEUE_URL = System.getenv("SQS_QUEUE_URL");
    private static final Region REGION = Region.of(System.getenv("AWS_REGION"));

    private final DynamoDbClient dynamoDbClient;
    private final SnsClient snsClient;
    private final SqsClient sqsClient;
    private final Gson gson;

    public RouterStoreHandler() {
        this.dynamoDbClient = DynamoDbClient.builder()
                .region(REGION)
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
        this.snsClient = SnsClient.builder()
                .region(REGION)
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
        this.sqsClient = SqsClient.builder()
                .region(REGION)
                .credentialsProvider(EnvironmentVariableCredentialsProvider.create())
                .build();
        this.gson = new Gson();
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent request, Context context) {
        String httpMethod = request.getHttpMethod();
        String path = request.getPath();

        try {
            if ("GET".equals(httpMethod) && path.equals("/essays")) {
                return getEssaysByUser(request, context);
            } else if ("GET".equals(httpMethod) && path.startsWith("/essays/")) {
                return getEssayById(request, context);
            } else if ("POST".equals(httpMethod) && path.equals("/essays")) {
                return createEssay(request, context);
            } else if ("PUT".equals(httpMethod) && path.startsWith("/essays/")) {
                return updateEssay(request, context);
            } else {
                return new APIGatewayProxyResponseEvent()
                        .withStatusCode(404)
                        .withBody("{\"error\":\"Not Found\"}")
                        .withHeaders(getCorsHeaders());
            }
        } catch (Exception e) {
            context.getLogger().log("Error: " + e.getMessage());
            return new APIGatewayProxyResponseEvent()
                    .withStatusCode(500)
                    .withBody("{\"error\":\"" + e.getMessage() + "\"}")
                    .withHeaders(getCorsHeaders());
        }
    }

    private APIGatewayProxyResponseEvent getEssaysByUser(APIGatewayProxyRequestEvent request, Context context) {
        JsonObject claims = gson.toJsonTree(request.getRequestContext().getAuthorizer().get("claims")).getAsJsonObject();
        String userId = claims.get("sub").getAsString();

        QueryRequest queryRequest = QueryRequest.builder()
                .tableName(DYNAMODB_TABLE)
                .keyConditionExpression("userId = :userId")
                .expressionAttributeValues(Map.of(":userId", AttributeValue.builder().s(userId).build()))
                .build();

        QueryResponse response = dynamoDbClient.query(queryRequest);
        List<Map<String, Object>> essays = new ArrayList<>();

        for (Map<String, AttributeValue> item : response.items()) {
            essays.add(convertItemToMap(item));
        }

        return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withBody(gson.toJson(essays))
                .withHeaders(getCorsHeaders());
    }

    private APIGatewayProxyResponseEvent getEssayById(APIGatewayProxyRequestEvent request, Context context) {
        String essayId = request.getPath().split("/")[2];
        JsonObject claims = gson.toJsonTree(request.getRequestContext().getAuthorizer().get("claims")).getAsJsonObject();
        String userId = claims.get("sub").getAsString();

        GetItemRequest getItemRequest = GetItemRequest.builder()
                .tableName(DYNAMODB_TABLE)
                .key(Map.of(
                        "userId", AttributeValue.builder().s(userId).build(),
                        "essayId", AttributeValue.builder().s(essayId).build()
                ))
                .build();

        GetItemResponse response = dynamoDbClient.getItem(getItemRequest);

        if (response.item() == null) {
            return new APIGatewayProxyResponseEvent()
                    .withStatusCode(404)
                    .withBody("{\"error\":\"Essay not found\"}")
                    .withHeaders(getCorsHeaders());
        }

        return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withBody(gson.toJson(convertItemToMap(response.item())))
                .withHeaders(getCorsHeaders());
    }

    private APIGatewayProxyResponseEvent createEssay(APIGatewayProxyRequestEvent request, Context context) {
        JsonObject body = gson.fromJson(request.getBody(), JsonObject.class);
        JsonObject claims = gson.toJsonTree(request.getRequestContext().getAuthorizer().get("claims")).getAsJsonObject();
        String userId = claims.get("sub").getAsString();
        String essayId = UUID.randomUUID().toString();

        Map<String, AttributeValue> item = new HashMap<>();
        item.put("userId", AttributeValue.builder().s(userId).build());
        item.put("essayId", AttributeValue.builder().s(essayId).build());
        item.put("filename", AttributeValue.builder().s(body.get("filename").getAsString()).build());
        item.put("fileKey", AttributeValue.builder().s(body.get("fileKey").getAsString()).build());
        item.put("status", AttributeValue.builder().s("PROCESSING").build());
        item.put("createdAt", AttributeValue.builder().n(String.valueOf(Instant.now().toEpochMilli())).build());

        PutItemRequest putItemRequest = PutItemRequest.builder()
                .tableName(DYNAMODB_TABLE)
                .item(item)
                .build();

        dynamoDbClient.putItem(putItemRequest);

        JsonObject sqsMessage = new JsonObject();
        sqsMessage.addProperty("fileKey", body.get("fileKey").getAsString());
        sqsMessage.addProperty("userId", userId);
        sqsMessage.addProperty("essayId", essayId);
        sqsMessage.addProperty("filename", body.get("filename").getAsString());

        SendMessageRequest sendMsgRequest = SendMessageRequest.builder()
                .queueUrl(SQS_QUEUE_URL)
                .messageBody(gson.toJson(sqsMessage))
                .build();

        sqsClient.sendMessage(sendMsgRequest);

        return new APIGatewayProxyResponseEvent()
                .withStatusCode(201)
                .withBody(gson.toJson(convertItemToMap(item)))
                .withHeaders(getCorsHeaders());
    }

    private APIGatewayProxyResponseEvent updateEssay(APIGatewayProxyRequestEvent request, Context context) {
        String essayId = request.getPath().split("/")[2];
        JsonObject claims = gson.toJsonTree(request.getRequestContext().getAuthorizer().get("claims")).getAsJsonObject();
        String userId = claims.get("sub").getAsString();
        JsonObject body = gson.fromJson(request.getBody(), JsonObject.class);

        Map<String, AttributeValueUpdate> updates = new HashMap<>();
        if (body.has("status")) {
            updates.put("status", AttributeValueUpdate.builder()
                    .value(AttributeValue.builder().s(body.get("status").getAsString()).build())
                    .action(AttributeAction.PUT)
                    .build());
        }
        if (body.has("score")) {
            updates.put("score", AttributeValueUpdate.builder()
                    .value(AttributeValue.builder().n(body.get("score").getAsString()).build())
                    .action(AttributeAction.PUT)
                    .build());
        }
        if (body.has("feedback")) {
            updates.put("feedback", AttributeValueUpdate.builder()
                    .value(AttributeValue.builder().s(body.get("feedback").getAsString()).build())
                    .action(AttributeAction.PUT)
                    .build());
        }
        if (body.has("resultKey")) {
            updates.put("resultKey", AttributeValueUpdate.builder()
                    .value(AttributeValue.builder().s(body.get("resultKey").getAsString()).build())
                    .action(AttributeAction.PUT)
                    .build());
        }
        updates.put("updatedAt", AttributeValueUpdate.builder()
                .value(AttributeValue.builder().n(String.valueOf(Instant.now().toEpochMilli())).build())
                .action(AttributeAction.PUT)
                .build());

        UpdateItemRequest updateItemRequest = UpdateItemRequest.builder()
                .tableName(DYNAMODB_TABLE)
                .key(Map.of(
                        "userId", AttributeValue.builder().s(userId).build(),
                        "essayId", AttributeValue.builder().s(essayId).build()
                ))
                .attributeUpdates(updates)
                .returnValues(ReturnValue.ALL_NEW)
                .build();

        UpdateItemResponse response = dynamoDbClient.updateItem(updateItemRequest);

        if (body.has("status") && body.get("status").getAsString().equals("COMPLETED")) {
            sendCompletionNotification(userId, essayId);
        }

        return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withBody(gson.toJson(convertItemToMap(response.attributes())))
                .withHeaders(getCorsHeaders());
    }

    private void sendCompletionNotification(String userId, String essayId) {
        String message = String.format("Your essay (ID: %s) has been scored!", essayId);
        PublishRequest publishRequest = PublishRequest.builder()
                .topicArn(SNS_TOPIC_ARN)
                .message(message)
                .subject("Essay Scoring Complete")
                .build();
        snsClient.publish(publishRequest);
    }

    private Map<String, Object> convertItemToMap(Map<String, AttributeValue> item) {
        Map<String, Object> map = new HashMap<>();
        for (Map.Entry<String, AttributeValue> entry : item.entrySet()) {
            AttributeValue value = entry.getValue();
            if (value.s() != null) {
                map.put(entry.getKey(), value.s());
            } else if (value.n() != null) {
                map.put(entry.getKey(), Long.parseLong(value.n()));
            }
        }
        return map;
    }

    private Map<String, String> getCorsHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "POST, GET, PUT, OPTIONS");
        headers.put("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return headers;
    }
}
