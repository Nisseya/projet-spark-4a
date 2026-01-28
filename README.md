### Sync avec uv

get uv (wsl):

```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc #Ou autre fichier zhsrc par exemple
```

puis dans la racine du dossier:

```sh
cd python
uv sync
```
Normalement c'est bon (je dis au pif j'ai pas l'habitude de faire ca)


### Get the data 

Prenez le .env.empty et remplissez le (kaggle> settings> api token)

Ensuite dans le terminal:

```sh
cd python
uv run python -m src.asl.dl_dataset
```
Et normalemement c bon