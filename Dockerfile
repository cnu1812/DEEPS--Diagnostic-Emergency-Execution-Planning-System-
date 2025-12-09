FROM kestra/kestra:latest

COPY ./kestra/flows /app/flows
EXPOSE 8080

# Start command
CMD ["server", "standalone"]