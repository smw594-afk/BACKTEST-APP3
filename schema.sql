-- 🗄️ V-TOTAL MASTER3.0 V3.20 Cloudflare D1 에지 데이터베이스 스키마

-- 1. 사용자 설정 테이블 (슬롯별 티커, 시작일, 투자법, 자산 구성 등 저장)
CREATE TABLE IF NOT EXISTS user_configs (
    user_id TEXT NOT NULL,
    slot_num INTEGER NOT NULL,
    ticker TEXT DEFAULT '',
    strategy TEXT DEFAULT '',
    config_json TEXT NOT NULL, -- 나머지 세부 설정값들을 JSON 스트링으로 한도 없이 안전하게 보관
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, slot_num)
);

-- 2. 일별 투자 상태 테이블 (시트의 LOG_유저아이디 역할 완벽 대체 및 초고속 스냅샷 복원)
CREATE TABLE IF NOT EXISTS daily_states (
    user_id TEXT NOT NULL,
    slot_num INTEGER NOT NULL,
    date TEXT NOT NULL,        -- YYYY-MM-DD 형식
    asset REAL NOT NULL,       -- 당일 기준 총자산 (시트 C열 역할)
    inout REAL DEFAULT 0.0,    -- 당일 기준 순입출금액 (시트 D열 역할)
    state_json TEXT NOT NULL,  -- 예수금(cash), 갱신원금(base), 보유주식 목록(holdings) 등을 상세 백업
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, slot_num, date)
);

-- 3. 매매 기록 히스토리 테이블 (성과 정밀 쿼리 및 통계 산출용)
CREATE TABLE IF NOT EXISTS trade_history (
    id TEXT PRIMARY KEY,       -- 고유 트레이드 ID
    user_id TEXT NOT NULL,
    slot_num INTEGER NOT NULL,
    buy_date TEXT NOT NULL,    -- 매수일
    sell_date TEXT NOT NULL,   -- 매도일
    mode TEXT NOT NULL,        -- 투자 모드 (SF, AG, DEF 등)
    tier INTEGER NOT NULL,     -- 진입 티어
    buy_price REAL NOT NULL,   -- 매수 평단가
    sell_price REAL NOT NULL,  -- 매도 평단가
    qty REAL NOT NULL,         -- 매도 수량
    profit REAL NOT NULL,      -- 실현 손익금
    total_balance REAL NOT NULL, -- 매도 당시 총자산
    renew_cash REAL NOT NULL    -- 매도 당시 갱신 원금
);

-- 검색 성능 극대화를 위한 인덱스 추가 생성
CREATE INDEX IF NOT EXISTS idx_daily_states_query ON daily_states(user_id, slot_num, date);
CREATE INDEX IF NOT EXISTS idx_trade_history_query ON trade_history(user_id, slot_num);
