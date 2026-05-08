import psycopg2
import sys

# Supabase 연결 정보
HOST = "db.piqatcicfmdtlpjzrlvh.supabase.co"
USER = "postgres"
PASSWORD = "xxSN7mhcn1InXMib"
DATABASE = "postgres"
PORT = "5432"

print("🔗 Supabase PostgreSQL에 연결 중...\n")

try:
    conn = psycopg2.connect(
        host=HOST,
        user=USER,
        password=PASSWORD,
        database=DATABASE,
        port=PORT
    )
    cursor = conn.cursor()
    print("✅ 연결 성공!\n")

    # SQL 스크립트
    sql_commands = [
        # 1. Users 테이블 생성
        """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,

        # 2. Todos 테이블 생성
        """
        CREATE TABLE IF NOT EXISTS todos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,

        # 3. 인덱스 생성
        "CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);",

        # 4. RLS 활성화
        "ALTER TABLE users ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE todos ENABLE ROW LEVEL SECURITY;",

        # 5. RLS 정책
        """
        CREATE POLICY IF NOT EXISTS "Users can view own data"
            ON users FOR SELECT
            USING (auth.uid()::text = id::text);
        """,

        """
        CREATE POLICY IF NOT EXISTS "Users can update own data"
            ON users FOR UPDATE
            USING (auth.uid()::text = id::text);
        """,

        """
        CREATE POLICY IF NOT EXISTS "Users can view own todos"
            ON todos FOR SELECT
            USING (user_id = auth.uid());
        """,

        """
        CREATE POLICY IF NOT EXISTS "Users can insert own todos"
            ON todos FOR INSERT
            WITH CHECK (user_id = auth.uid());
        """,

        """
        CREATE POLICY IF NOT EXISTS "Users can update own todos"
            ON todos FOR UPDATE
            USING (user_id = auth.uid());
        """,

        """
        CREATE POLICY IF NOT EXISTS "Users can delete own todos"
            ON todos FOR DELETE
            USING (user_id = auth.uid());
        """
    ]

    # SQL 실행
    print("📋 Schema 생성 중...\n")
    for i, sql in enumerate(sql_commands, 1):
        try:
            cursor.execute(sql)
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"⚠️  명령 {i} 주의: {e}")

    print("✅ Schema 생성 완료!\n")

    # 테이블 확인
    print("📊 생성된 테이블 확인:\n")
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'todos')
        ORDER BY table_name;
    """)

    tables = cursor.fetchall()
    for table in tables:
        print(f"  ✅ {table[0]}")

    # 컬럼 확인
    print("\n📝 Users 테이블 컬럼:")
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
    """)
    for col in cursor.fetchall():
        print(f"  • {col[0]}: {col[1]}")

    print("\n📝 Todos 테이블 컬럼:")
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'todos'
        ORDER BY ordinal_position;
    """)
    for col in cursor.fetchall():
        print(f"  • {col[0]}: {col[1]}")

    # RLS 정책 확인
    print("\n🔐 RLS 정책 확인:")
    cursor.execute("""
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE tablename IN ('users', 'todos');
    """)
    policies = cursor.fetchall()
    for policy in policies:
        print(f"  ✅ {policy[2]}")

    print("\n" + "="*60)
    print("🚀 Supabase Schema 생성 완료!")
    print("="*60)

    cursor.close()
    conn.close()

except Exception as e:
    print(f"❌ 오류 발생: {e}")
    sys.exit(1)
