-- =====================================================================
-- DayT Initial Database Schema (V1)
-- Single Source of Truth: docs/erd.md (PostgreSQL 16 + PostGIS + JSONB)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. couples (커플 매칭)
CREATE TABLE couples (
    id           BIGSERIAL PRIMARY KEY,
    invite_code  VARCHAR(20) NOT NULL UNIQUE,
    started_date DATE NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. users (사용자)
CREATE TABLE users (
    id                BIGSERIAL PRIMARY KEY,
    couple_id         BIGINT NULL REFERENCES couples(id) ON DELETE SET NULL,
    email             VARCHAR(255) NULL UNIQUE,
    nickname          VARCHAR(50) NOT NULL,
    profile_image_url TEXT NULL,
    oauth_provider    VARCHAR(20) NOT NULL,
    oauth_id          VARCHAR(100) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_users_oauth UNIQUE (oauth_provider, oauth_id)
);

-- 3. places (장소 마스터 + Gemini 요약 데이터)
CREATE TABLE places (
    id                   BIGSERIAL PRIMARY KEY,
    external_provider    VARCHAR(20) NOT NULL,
    external_place_id    VARCHAR(100) NOT NULL,
    name                 VARCHAR(150) NOT NULL,
    category_group       VARCHAR(30) NOT NULL,
    food_category        VARCHAR(30) NULL,
    sub_category         VARCHAR(100) NULL,
    address              VARCHAR(255) NOT NULL,
    region_keyword       VARCHAR(50) NULL,
    latitude             DOUBLE PRECISION NOT NULL,
    longitude            DOUBLE PRECISION NOT NULL,
    location             GEOGRAPHY(Point, 4326) NOT NULL,
    phone                VARCHAR(30) NULL,
    place_url            TEXT NULL,
    thumbnail_url        TEXT NULL,
    avg_price_per_person INTEGER NULL,
    is_indoor            BOOLEAN NULL,
    hashtags             JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_menus    JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_summary           VARCHAR(300) NULL,
    event_start_date     DATE NULL,
    event_end_date       DATE NULL,
    ai_enriched_at       TIMESTAMPTZ NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_places_external UNIQUE (external_provider, external_place_id)
);

CREATE INDEX idx_places_location ON places USING GIST (location);
CREATE INDEX idx_places_hashtags ON places USING GIN (hashtags);
CREATE INDEX idx_places_category ON places (category_group, food_category);

-- 4. courses (데이트 코스 헤더)
CREATE TABLE courses (
    id                     BIGSERIAL PRIMARY KEY,
    creator_id             BIGINT NOT NULL REFERENCES users(id),
    couple_id              BIGINT NULL REFERENCES couples(id) ON DELETE SET NULL,
    title                  VARCHAR(100) NOT NULL,
    description            TEXT NULL,
    theme_tags             JSONB NOT NULL DEFAULT '[]'::jsonb,
    time_slot              VARCHAR(20) NULL,
    total_estimated_cost   INTEGER NOT NULL DEFAULT 0,
    total_duration_minutes INTEGER NOT NULL DEFAULT 0,
    source_type            VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',
    share_token            VARCHAR(64) NOT NULL UNIQUE,
    is_collab_open         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. course_places (코스-장소 매핑 및 방문 순서)
CREATE TABLE course_places (
    id                     BIGSERIAL PRIMARY KEY,
    course_id              BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    place_id               BIGINT NOT NULL REFERENCES places(id),
    visit_order            INTEGER NOT NULL,
    estimated_cost         INTEGER NOT NULL DEFAULT 0,
    stay_minutes           INTEGER NOT NULL DEFAULT 60,
    travel_minutes_to_next INTEGER NOT NULL DEFAULT 0,
    memo                   VARCHAR(255) NULL
);

CREATE INDEX idx_course_places_order ON course_places (course_id, visit_order);

-- 6. couple_pets (Grow Together 캐릭터)
CREATE TABLE couple_pets (
    id              BIGSERIAL PRIMARY KEY,
    couple_id       BIGINT NOT NULL UNIQUE REFERENCES couples(id) ON DELETE CASCADE,
    name            VARCHAR(50) NOT NULL,
    character_type  VARCHAR(30) NOT NULL DEFAULT 'BASIC',
    level           INTEGER NOT NULL DEFAULT 1,
    exp             INTEGER NOT NULL DEFAULT 0,
    last_met_date   DATE NULL,
    total_meet_days INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. daily_missions (오늘의 성장 미션 마스터)
CREATE TABLE daily_missions (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    reward_exp  INTEGER NOT NULL DEFAULT 10,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8. couple_mission_logs (커플별 일일 미션 배정 및 달성 기록)
CREATE TABLE couple_mission_logs (
    id            BIGSERIAL PRIMARY KEY,
    couple_id     BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
    mission_id    BIGINT NOT NULL REFERENCES daily_missions(id),
    assigned_date DATE NOT NULL,
    is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at  TIMESTAMPTZ NULL,
    CONSTRAINT uk_couple_mission_daily UNIQUE (couple_id, mission_id, assigned_date)
);

-- 9. diaries (데이트 일기장)
CREATE TABLE diaries (
    id         BIGSERIAL PRIMARY KEY,
    couple_id  BIGINT NULL REFERENCES couples(id) ON DELETE SET NULL,
    author_id  BIGINT NOT NULL REFERENCES users(id),
    course_id  BIGINT NULL REFERENCES courses(id) ON DELETE SET NULL,
    date_at    DATE NOT NULL,
    title      VARCHAR(100) NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. diary_images (일기 첨부 사진)
CREATE TABLE diary_images (
    id            BIGSERIAL PRIMARY KEY,
    diary_id      BIGINT NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
    image_url     TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1
);

