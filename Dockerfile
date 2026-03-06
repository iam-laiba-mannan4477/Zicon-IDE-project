FROM ubuntu:22.04

WORKDIR /workspace

# Minimal necessary tools
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    bash git python3 python3-pip curl nano && \
    rm -rf /var/lib/apt/lists/*

CMD ["bash"]