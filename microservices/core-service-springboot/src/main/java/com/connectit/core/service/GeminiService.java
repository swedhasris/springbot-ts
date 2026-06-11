package com.connectit.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String generateContent(String prompt, String imageBase64, String mimeType, boolean expectJson) {
        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            System.err.println("[GeminiService] API key is missing or empty.");
            return null;
        }

        try {
            String model = geminiModel != null && !geminiModel.trim().isEmpty() ? geminiModel : "gemini-2.5-flash";
            String urlStr = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;

            // Build request JSON
            Map<String, Object> requestBody = new HashMap<>();

            Map<String, Object> partText = new HashMap<>();
            partText.put("text", prompt);

            List<Map<String, Object>> parts = new ArrayList<>();
            parts.add(partText);

            if (imageBase64 != null && !imageBase64.isEmpty()) {
                Map<String, Object> inlineData = new HashMap<>();
                inlineData.put("mimeType", mimeType != null ? mimeType : "image/jpeg");
                inlineData.put("data", imageBase64);

                Map<String, Object> partImage = new HashMap<>();
                partImage.put("inlineData", inlineData);
                parts.add(partImage);
            }

            Map<String, Object> contentNode = new HashMap<>();
            contentNode.put("parts", parts);

            requestBody.put("contents", List.of(contentNode));

            if (expectJson) {
                Map<String, Object> generationConfig = new HashMap<>();
                generationConfig.put("responseMimeType", "application/json");
                requestBody.put("generationConfig", generationConfig);
            }

            String jsonPayload = objectMapper.writeValueAsString(requestBody);

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(urlStr))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .timeout(Duration.ofSeconds(20))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                String responseBody = response.body();
                Map<?, ?> resMap = objectMapper.readValue(responseBody, Map.class);
                List<?> candidates = (List<?>) resMap.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<?, ?> firstCandidate = (Map<?, ?>) candidates.get(0);
                    Map<?, ?> content = (Map<?, ?>) firstCandidate.get("content");
                    if (content != null) {
                        List<?> responseParts = (List<?>) content.get("parts");
                        if (responseParts != null && !responseParts.isEmpty()) {
                            Map<?, ?> firstPart = (Map<?, ?>) responseParts.get(0);
                            return (String) firstPart.get("text");
                        }
                    }
                }
            } else {
                System.err.println("[GeminiService Error] Status code: " + response.statusCode() + ", Response body: " + response.body());
            }
        } catch (Exception e) {
            System.err.println("[GeminiService Exception] " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }
}
