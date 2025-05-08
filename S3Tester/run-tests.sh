#!/bin/bash

# Run the S3 connection tests

echo "Building S3Tester..."
dotnet build

echo "Running S3 connection tests..."
dotnet run

echo "Test execution complete."