Je fais ce fichier comme ca on est d'accord pour le dev:

- Pour les data de train:
Bucket-Name/datasets/asl/train/part-00000.parquet

- Pour le dataset de test:
Bucket-Name/datasets/asl/test/part-00000.parquet

- Pour les videos uploadées directement:
Bucket-Name/raw_video/{video_id}/source.mp4

- Pour les images extraites raw (jpeg?):
Bucket-Name/extracted_images_raw/video_id={video_id}/shard_id={0000}/part-00000.parquet

- Pour les images décodées par spark (scala):
Bucket-Name/extracted_images_processed/video_id={video_id}/shard_id={0000}/part-00000.parquet

- Et après on fait direct l'inférence sur toute la video_id et on crée un parquet:
Bucket-name/job_results/{video_id}/predictions.parquet

Les schémas des fichierst parquet: 
frame_index     INTEGER     -- index du frame dans la vidéo (0, 1, 2, …)
timestamp_ms    INTEGER     -- timestamp du frame dans la vidéo (ms)
?
