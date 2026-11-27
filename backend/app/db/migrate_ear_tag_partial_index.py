import logging
from sqlalchemy import text, inspect
from app.db.session import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("migration")

def run_migration():
    logger.info("Starting migration on database: %s", engine.url.host)
    with engine.begin() as conn:
        # 1. Drop existing unique constraint if exists
        logger.info("Dropping constraint uq_user_ear_tag if exists...")
        conn.execute(text("ALTER TABLE sapi DROP CONSTRAINT IF EXISTS uq_user_ear_tag;"))
        
        # 2. Drop index if exists
        conn.execute(text("DROP INDEX IF EXISTS uq_user_ear_tag;"))

        # 3. Create partial unique index
        logger.info("Creating partial unique index uq_sapi_active_ear_tag_per_user...")
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_sapi_active_ear_tag_per_user
            ON sapi (id_user, ear_tag)
            WHERE tanggal_keluar IS NULL;
        """))

    inspector = inspect(engine)
    uqs = inspector.get_unique_constraints("sapi")
    indexes = inspector.get_indexes("sapi")
    logger.info("Migration completed successfully!")
    logger.info("Current unique constraints on sapi: %s", uqs)
    logger.info("Current indexes on sapi: %s", indexes)

if __name__ == "__main__":
    run_migration()
