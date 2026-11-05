"""
NEXUS PULSE - Local Ollama Connectivity & Extraction Tester
Usage:
    python test_local_ollama.py 192.168.1.55
    python test_local_ollama.py 192.168.1.55 --model qwen2.5:3b
"""
import sys
import json
import time
import urllib.request
import urllib.error

def main():
    args = sys.argv[1:]
    target_host = "localhost"
    model = "qwen2.5:3b"

    if args:
        target_host = args[0].replace("http://", "").replace("https://", "").split(":")[0]
    
    if "--model" in args:
        idx = args.index("--model")
        if idx + 1 < len(args):
            model = args[idx + 1]

    base_url = f"http://{target_host}:11434"
    print(f"\n=======================================================")
    print(f" NEXUS PULSE -> Local Ollama Model Tester")
    print(f" Target Host: {base_url}")
    print(f" Target Model: {model}")
    print(f"=======================================================\n")

    # Step 1: Ping /api/tags
    print(f"[1/3] Pinging Ollama at {base_url}/api/tags ...")
    t0 = time.time()
    try:
        req = urllib.request.Request(f"{base_url}/api/tags", headers={"User-Agent": "NexusPulse-Tester"})
        with urllib.request.urlopen(req, timeout=8) as res:
            elapsed = round((time.time() - t0) * 1000, 1)
            raw = res.read().decode("utf-8")
            data = json.loads(raw)
            models = [m.get("name") for m in data.get("models", [])]
            print(f"  [OK] Connected successfully! ({elapsed} ms latency)")
            print(f"  [OK] Available models on machine: {models}")
            if not any(model in m for m in models):
                print(f"  [!] Note: '{model}' was not found in the list above. Available: {models}")
    except Exception as e:
        print(f"  [FAILED] Failed to reach Ollama at {base_url}!")
        print(f"     Error: {e}")
        print("\n  Troubleshooting Checklist:")
        print(f"  1. On the other machine, did you set OLLAMA_HOST=0.0.0.0:11434 ?")
        print(f"     In PowerShell:  $env:OLLAMA_HOST='0.0.0.0:11434'; ollama serve")
        print(f"  2. Is Windows Defender Firewall allowing incoming port 11434 on the other machine?")
        print(f"  3. Can you ping {target_host} from this machine?")
        return

    # Step 2: Test Chat Completion via OpenAI-compatible endpoint
    print(f"\n[2/3] Sending sample opportunity to {model} ...")
    test_announcement = (
        "KPITB and Code for Pakistan announce KP Fellowship 2026. "
        "Flagship digital government cohort in Peshawar. "
        "Application deadline: 2026-11-20. Program starts: 2026-12-01. "
        "Apply online at: https://kpitb.gov.pk/fellowship"
    )

    prompt = (
        "You are NEXUS PULSE Opportunity Intelligence Extractor. "
        "Extract the opportunity as a JSON object with fields: "
        "title, category, start_date, registration_deadline, registration_url, is_opportunity (true/false). "
        "Return ONLY a valid JSON object.\n\n"
        f"ANNOUNCEMENT:\n{test_announcement}"
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "stream": False
    }

    t1 = time.time()
    try:
        req = urllib.request.Request(
            f"{base_url}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=60) as res:
            elapsed = round(time.time() - t1, 2)
            raw = res.read().decode("utf-8")
            data = json.loads(raw)
            content = data.get("message", {}).get("content", "").strip()
            print(f"  [OK] Model answered in {elapsed}s!\n")
            print(f"[3/3] Extracted Output from {model}:")
            print("-------------------------------------------------------")
            print(content)
            print("-------------------------------------------------------")
            print("\n[SUCCESS] Your local Ollama model is fully ready for NEXUS PULSE!")
    except Exception as e:
        print(f"  [FAILED] Chat generation failed: {e}")

if __name__ == "__main__":
    main()
