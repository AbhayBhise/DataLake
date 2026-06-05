import base64
import urllib.request
import os

artifacts_dir = r"C:\Users\HP\.gemini\antigravity-ide\brain\d574de43-f900-47fd-b3b8-d48bf495299c"

def download_mermaid(mermaid_code, filename):
    # mermaid.ink accepts base64 urlsafe encoded graph text
    encoded = base64.urlsafe_b64encode(mermaid_code.encode('utf-8')).decode('utf-8')
    # Pad to make base64 happy?
    url = f"https://mermaid.ink/img/{encoded}"
    filepath = os.path.join(artifacts_dir, filename)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
        data = response.read()
        out_file.write(data)

arch_code = """graph TD
    subgraph UI [React Native Layer]
        A[Authentication App]
        S[Sync Manager]
    end
    subgraph Bridge [TurboModule Bridge]
        B[FaceAuthModule JNI]
    end
    subgraph Native [Android Edge Processing]
        C[CameraX / ML Kit]
        D[TFLite MobileFaceNet]
        E[(SQLite DB)]
    end
    subgraph Cloud [AWS Cloud]
        F[API Gateway / Datalake]
    end
    A -->|Start Scan| B
    B -->|Fetch Frames| C
    C -->|Detected Faces| D
    D -->|Embeddings| E
    E -->|Similarity Score| B
    B -->|Auth Result| A
    
    A -->|Save Offline Log| E
    S -->|Fetch Logs| E
    S -->|Upload Batches| F
    F -.->|200 OK| S
    S -->|Purge Sent Logs| E
"""

block_code = """flowchart LR
    A[Camera Frame] --> B[Face Detector]
    B --> C{Liveness}
    C -- Pass --> D[Alignment]
    C -- Fail --> X[Reject]
    D --> E[MobileFaceNet]
    E --> F[192D Vector]
    F --> G[(Local DB)]
    G --> H{Distance Match}
    H -- Match --> I[Log Authentication]
    I --> K[(Offline Attendance DB)]
    
    L[Online Toggle Active] --> M[Trigger Sync]
    M --> N[Fetch Unsynced Logs]
    N --> K
    N --> O[AWS API Gateway]
    O -- Success --> P[Purge Local Logs]
    P --> K
"""

try:
    download_mermaid(arch_code, "architecture_diagram.png")
    print("Downloaded architecture_diagram.png")
    download_mermaid(block_code, "block_diagram.png")
    print("Downloaded block_diagram.png")
except Exception as e:
    print(f"Error: {e}")
