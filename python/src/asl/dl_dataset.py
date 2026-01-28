from pathlib import Path
import shutil
import zipfile
import os

from dotenv import load_dotenv
load_dotenv()

from kaggle.api.kaggle_api_extended import KaggleApi


DATASET = "grassknoted/asl-alphabet"
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_ROOT = PROJECT_ROOT / "data" / "asl"
TRAIN_DIR = DATA_ROOT / "train"
TEST_DIR = DATA_ROOT / "test"

TMP_DIR = Path("data/.kaggle_tmp")

if DATA_ROOT.exists():
    raise RuntimeError(f"{DATA_ROOT} already exists")

if TMP_DIR.exists():
    shutil.rmtree(TMP_DIR)
TMP_DIR.mkdir(parents=True)

api = KaggleApi()
api.authenticate()

api.dataset_download_files(
    DATASET,
    path=str(TMP_DIR),
    unzip=False,
    quiet=False,
)

for z in TMP_DIR.glob("*.zip"):
    with zipfile.ZipFile(z) as f:
        f.extractall(TMP_DIR)
    z.unlink()

raw_train = TMP_DIR / "asl_alphabet_train"
raw_test = TMP_DIR / "asl_alphabet_test"

def unwrap(p: Path) -> Path:
    children = list(p.iterdir())
    if len(children) == 1 and children[0].is_dir():
        return children[0]
    return p

raw_train = unwrap(raw_train)
raw_test = unwrap(raw_test)

TRAIN_DIR.mkdir(parents=True)
TEST_DIR.mkdir(parents=True)

for item in raw_train.iterdir():
    shutil.move(str(item), TRAIN_DIR / item.name)

for item in raw_test.iterdir():
    shutil.move(str(item), TEST_DIR / item.name)

shutil.rmtree(TMP_DIR)

print("✅ Dataset ready")
print(f"  Train → {TRAIN_DIR.resolve()}")
print(f"  Test  → {TEST_DIR.resolve()}")
