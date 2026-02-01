from pathlib import Path

SOURCE_BASE = Path(".env")
TARGET_DIRS = ["python", "spark-scala", "frontend", "infrastructure"]


def load_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    return env


def patch_file(path: Path, source: dict[str, str]) -> None:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("", encoding="utf-8")

    lines = path.read_text(encoding="utf-8").splitlines()
    out = []
    for line in lines:
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
            out.append(line)
            continue

        k, _ = line.split("=", 1)
        k = k.strip()

        if k in source:
            out.append(f"{k}={source[k]}")
        else:
            out.append(line)

    path.write_text("\n".join(out) + "\n", encoding="utf-8")


def main() -> None:
    source = {}
    source.update(load_env(SOURCE_BASE))

    for d in TARGET_DIRS:
        patch_file(Path(d) / ".env", source)


if __name__ == "__main__":
    main()
