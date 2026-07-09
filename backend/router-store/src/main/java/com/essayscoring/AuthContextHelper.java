package com.essayscoring;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

import java.util.Map;
import java.util.Optional;

public final class AuthContextHelper {
    private AuthContextHelper() {
    }

    public static Optional<String> extractUserId(APIGatewayProxyRequestEvent request, Gson gson) {
        if ("true".equals(System.getenv("AWS_SAM_LOCAL"))) {
            if (request != null && request.getHeaders() != null) {
                String mockUserId = request.getHeaders().get("X-Mock-User-Id");
                if (mockUserId == null) {
                    mockUserId = request.getHeaders().get("x-mock-user-id");
                }
                if (mockUserId != null && !mockUserId.trim().isEmpty()) {
                    return Optional.of(mockUserId);
                }
                
                String authHeader = request.getHeaders().get("Authorization");
                if (authHeader == null) {
                    authHeader = request.getHeaders().get("authorization");
                }
                if (authHeader != null && authHeader.startsWith("Bearer ") && authHeader.length() > 7) {
                    String token = authHeader.substring(7).trim();
                    if (!token.isEmpty() && !"demo-token".equals(token)) {
                        return Optional.of(token);
                    }
                }
            }
            return Optional.of("local-mock-user");
        }

        if (request == null || request.getRequestContext() == null) {
            return Optional.empty();
        }

        Map<String, Object> authorizer = request.getRequestContext().getAuthorizer();
        if (authorizer == null || authorizer.get("claims") == null) {
            return Optional.empty();
        }

        JsonObject claims = gson.toJsonTree(authorizer.get("claims")).getAsJsonObject();
        if (!claims.has("sub") || claims.get("sub") == null || claims.get("sub").isJsonNull()) {
            return Optional.empty();
        }

        return Optional.of(claims.get("sub").getAsString());
    }
}
