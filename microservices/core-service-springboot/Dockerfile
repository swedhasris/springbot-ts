# ── Build stage — Maven + JDK 17 ───────────────────────────────────
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# ── Runtime stage — Eclipse Temurin JRE 17 ─────────────────────────
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/ticklora-core-1.0.0.jar app.jar

# Render injects PORT; default to 3000 if not set
ENV PORT=3000

# JVM tuning for Render free tier (512 MB RAM)
ENV JAVA_OPTS="-Xms128m -Xmx400m -XX:+UseContainerSupport -XX:MaxRAMPercentage=75"

EXPOSE $PORT

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dserver.port=$PORT -jar app.jar"]
