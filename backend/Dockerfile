# Start with an official Python base image.
# Using a "slim" version is a good practice for smaller container sizes.
FROM python:3.11-slim

# Set the working directory inside the container.
WORKDIR /app

# Copy the requirements file into the container.
COPY requirements.txt .

# Install the Python dependencies.
# The `--no-cache-dir` flag is a best practice for smaller Docker images.
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code into the container.
COPY . .

# Expose the port that the application will run on.
# Hugging Face Spaces automatically provides a PORT variable, typically 7860.
# FastAPI will run on this port inside the container.
EXPOSE 7860

# The command to run your application when the container starts.
# We use Gunicorn as a robust production server.
CMD ["gunicorn", "-w", "1", "--preload", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:7860", "main:app"]