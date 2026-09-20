# Multi-stage build for Spring Boot application with Java 21
FROM maven:3.9.8-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build production jar skipping tests
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy built jar from build stage
COPY --from=build /app/target/feedback-workflow-0.0.1-SNAPSHOT.jar app.jar

# Expose port (Render sets PORT env variable dynamically)
EXPOSE 3000

# Start command
ENTRYPOINT ["java", "-jar", "app.jar"]
