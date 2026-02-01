## Sync le repo:

Après avoir cloné:

#### Les .env:

Pour scala, frontend et infrastructure on s'en fout un peu, je les mets en public parce que c'est que des variables locales
Pour python, il faut éditer le fichier .env.example en ajoutant les variables kaggle (obtenables directement sur Kaggle), et renommer le fichier en .env

Si vous voulez renommer certaines variables, vous pouvez les renommer sur le .env global partagé et faire
```sh
python -m scripts.generate-env
```
depuis la racine du projet. Cela va synchroniser toutes ces variables avec le reste.


#### Les dépendances python

1. get uv (wsl):

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


#### Démarrer l'infra du projet:

Il y a un dossier avec docker compose pour l'infra (Object store + bdd)
Le choix de l'object store par rapport au système de fichier c'est parce que "en production" c'est comme ca normalement, du coup c'est toujours sympa de se faire la main dessus (surtout si on fait une app web, c'est mieux d'avoir un object store).
Pour un projet d'école on s'en fout un peu mais voila

L'autre raison c'est que comme ca on se fait pas chier avec les chemins qui sortent des projets, l'url suffit et c'est plus propre je trouve pour y accéder.

La bdd c postgres parce qu'il y a plus de documentation en ligne (oui edouard sqlite fait très largement l'affaire en consommant 35 fois moins de mémoire je sais)

enfin bref:

```sh
cd infrastructure
docker compose up
```

#### Get the data 

Si votre .env est bien édité pour avoir les variales kaggle, et que l'object store tourne (très important):

depuis la racine du projet:

```sh
cd python
uv run python -m src.asl.dl3
```

j'ai pas retesté le script, je dois changer un peu

Et normalemement vous attendez un peu et c'est bon
