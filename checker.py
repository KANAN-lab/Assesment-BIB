#!/usr/bin/env python3
"""
checker.py — BIB Logistics Assessment Platform
Cross-check tool: mendeteksi bug potensial, fitur yang belum diimplementasikan,
dan inkonsistensi antara PRD, Task.md, dan source code.

Usage:
    python checker.py
    python checker.py --verbose
    python checker.py --category supabase
"""

import os
import re
import sys
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import Literal

# ─── Config ──────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent
SRC = ROOT / "src"
COMPONENTS = SRC / "components"
TYPES_DIR = SRC / "types"
LIB_DIR = SRC / "lib"

CheckLevel = Literal["ERROR", "WARN", "INFO", "OK"]

@dataclass
class CheckResult:
    level: CheckLevel
    category: str
    message: str
    file: str = ""
    line: int = 0

    def __str__(self):
        loc = f" [{self.file}:{self.line}]" if self.file else ""
        icon = {"ERROR": "[ERROR]", "WARN": "[WARN] ", "INFO": "[INFO] ", "OK": "[OK]   "}[self.level]
        return f"  {icon} [{self.category}]{loc} {self.message}"


results: list[CheckResult] = []


def add(level: CheckLevel, category: str, message: str, file: str = "", line: int = 0):
    results.append(CheckResult(level, category, message, file, line))


def read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def find_in_file(path: Path, pattern: str, flags=0) -> list[tuple[int, str]]:
    """Return list of (line_number, line_content) matching pattern."""
    matches = []
    try:
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if re.search(pattern, line, flags):
                matches.append((i, line.strip()))
    except FileNotFoundError:
        pass
    return matches


# ─── Checks ──────────────────────────────────────────────────────────────────

def check_env():
    """Pastikan .env.local ada dan berisi variabel yang diperlukan."""
    env_file = ROOT / ".env.local"
    if not env_file.exists():
        add("ERROR", "ENV", ".env.local tidak ditemukan. Supabase tidak akan berfungsi.")
        return
    content = env_file.read_text()
    if "VITE_SUPABASE_URL" not in content:
        add("ERROR", "ENV", ".env.local tidak memiliki VITE_SUPABASE_URL")
    else:
        add("OK", "ENV", "VITE_SUPABASE_URL tersedia")
    if "VITE_SUPABASE_ANON_KEY" not in content:
        add("ERROR", "ENV", ".env.local tidak memiliki VITE_SUPABASE_ANON_KEY")
    else:
        add("OK", "ENV", "VITE_SUPABASE_ANON_KEY tersedia")
    if "service_role" in content or "SERVICE_ROLE" in content:
        add("ERROR", "SECURITY", ".env.local mengandung service_role key — JANGAN expose ke frontend!")


def check_gitignore():
    """Pastikan .env.local di-ignore."""
    gi = ROOT / ".gitignore"
    if not gi.exists():
        add("WARN", "GIT", ".gitignore tidak ditemukan")
        return
    content = gi.read_text()
    if ".env.local" not in content and ".env*" not in content:
        add("ERROR", "SECURITY", ".gitignore tidak mengecualikan .env.local — API key bisa ter-commit!")
    else:
        add("OK", "GIT", ".env.local terlindungi di .gitignore")


def check_supabase_client():
    """Verifikasi supabaseClient.ts ada dan tidak expose service_role."""
    client_file = LIB_DIR / "supabaseClient.ts"
    if not client_file.exists():
        add("ERROR", "SUPABASE", "src/lib/supabaseClient.ts tidak ditemukan")
        return
    content = client_file.read_text()
    if "createClient" not in content:
        add("ERROR", "SUPABASE", "supabaseClient.ts tidak memanggil createClient()")
    else:
        add("OK", "SUPABASE", "supabaseClient.ts valid")
    if "service_role" in content or "eyJ" in content.split("import.meta.env")[0]:
        add("ERROR", "SECURITY", "supabaseClient.ts kemungkinan hardcode API key — gunakan import.meta.env")


def check_supabase_service():
    """Verifikasi semua fungsi layanan DB tersedia."""
    service_file = LIB_DIR / "supabaseService.ts"
    if not service_file.exists():
        add("ERROR", "SUPABASE", "src/lib/supabaseService.ts tidak ditemukan")
        return

    required_functions = [
        "fetchAllWorkers",
        "fetchWorkerById",
        "fetchLeaderboard",
        "fetchRewardCatalog",
        "fetchRedemptionHistory",
        "insertRedemption",
        "completeWorkerQuiz",
        "completeWorkerChecklist",
        "supervisorAuditWorker",
    ]
    content = service_file.read_text()
    for fn in required_functions:
        if f"export async function {fn}" not in content and f"export function {fn}" not in content:
            add("ERROR", "SUPABASE", f"Fungsi '{fn}' tidak ditemukan di supabaseService.ts")
        else:
            add("OK", "SUPABASE", f"Fungsi '{fn}' tersedia")


def check_mock_data_usage():
    """Pastikan App.tsx tidak lagi import data statis yang seharusnya dari DB."""
    app_file = SRC / "App.tsx"
    if not app_file.exists():
        add("ERROR", "CODE", "src/App.tsx tidak ditemukan")
        return

    content = app_file.read_text()
    forbidden_imports = ["INITIAL_CURRENT_WORKER", "INITIAL_LEADERBOARD", "REWARD_CATALOG"]
    for symbol in forbidden_imports:
        if symbol in content:
            add("WARN", "MOCK_DATA", f"App.tsx masih menggunakan '{symbol}' dari mockData — seharusnya dari Supabase")
        else:
            add("OK", "MOCK_DATA", f"'{symbol}' tidak digunakan di App.tsx (sudah dari DB)")

    if "DAILY_QUIZZES" in content:
        add("INFO", "MOCK_DATA", "DAILY_QUIZZES masih dari mockData.ts — acceptable jika soal kuis belum di DB")


def check_app_tsx():
    """Audit App.tsx untuk pattern penting."""
    app_file = SRC / "App.tsx"
    content = read(app_file)
    if not content:
        return

    checks = {
        "useEffect": ("ERROR", "App.tsx tidak memiliki useEffect — data tidak akan di-load dari Supabase"),
        "setLoading": ("ERROR", "App.tsx tidak memiliki loading state"),
        "setError": ("ERROR", "App.tsx tidak memiliki error state"),
        "loadDataForWorker": ("OK", "loadDataForWorker function tersedia"),
        "optimistic": ("INFO", "Cek manual: apakah optimistic update diimplementasikan?"),
        "Loader2": ("OK", "Loading spinner (Loader2) tersedia"),
        "AlertCircle": ("OK", "Error state (AlertCircle) tersedia"),
    }

    for keyword, (level, message) in checks.items():
        if keyword not in content:
            if level == "OK":
                add("WARN", "APP", message.replace("tersedia", "TIDAK tersedia"))
            elif level == "INFO":
                add("INFO", "APP", message)
            else:
                add(level, "APP", message)
        else:
            if level in ("OK", "ERROR"):
                effective_level: CheckLevel = "OK" if level == "ERROR" else "OK"
                add(effective_level, "APP", message)


def check_components():
    """Verifikasi semua komponen yang direferensikan di App.tsx ada."""
    app_content = read(SRC / "App.tsx")
    required_components = [
        "Navbar", "BibRadarChart", "DailyQuestModal",
        "PreShiftChecklistModal", "RewardMarketplace",
        "LeaderboardSection", "SupervisorConsole"
    ]
    for comp in required_components:
        comp_file = COMPONENTS / f"{comp}.tsx"
        if not comp_file.exists():
            add("ERROR", "COMPONENTS", f"{comp}.tsx tidak ditemukan di src/components/")
        else:
            add("OK", "COMPONENTS", f"{comp}.tsx ada")

        if comp in app_content and comp_file.exists():
            comp_content = read(comp_file)
            if f"export" not in comp_content:
                add("WARN", "COMPONENTS", f"{comp}.tsx tidak memiliki export statement")


def check_typescript():
    """Cek inkonsistensi tipe antara types/assessment.ts dan supabaseService.ts."""
    types_file = TYPES_DIR / "assessment.ts"
    service_file = LIB_DIR / "supabaseService.ts"

    if not types_file.exists():
        add("ERROR", "TYPES", "src/types/assessment.ts tidak ditemukan")
        return

    types_content = read(types_file)
    service_content = read(service_file)

    # Check BibScores fields
    for field_name in ["behavior", "integrity", "benchmark", "totalScore"]:
        if field_name not in types_content:
            add("WARN", "TYPES", f"Field '{field_name}' tidak ditemukan di BibScores interface")

    # Check WorkerProfile fields
    for field_name in ["streakDays", "totalPoints", "dailyQuizCompleted", "preShiftChecklistDone"]:
        if field_name not in types_content:
            add("WARN", "TYPES", f"Field '{field_name}' tidak ditemukan di WorkerProfile interface")

    # Check mapper consistency
    db_fields = ["streak_days", "total_points", "daily_quiz_completed", "pre_shift_checklist_done",
                 "bib_behavior", "bib_integrity", "bib_benchmark", "bib_total_score"]
    for db_field in db_fields:
        if db_field not in service_content:
            add("WARN", "TYPES", f"DB field '{db_field}' tidak di-map di supabaseService.ts")
        else:
            add("OK", "TYPES", f"DB field '{db_field}' di-map dengan benar")


def check_prd_features():
    """Cross-check fitur di PRD vs implementasi di source code."""
    prd = read(ROOT / "PRD.md")
    src_content = ""
    for ts_file in SRC.rglob("*.tsx"):
        src_content += read(ts_file)
    for ts_file in SRC.rglob("*.ts"):
        src_content += read(ts_file)

    features = {
        "canvas-confetti": ("OK" if "confetti" in src_content else "WARN",
                            "Animasi confetti saat klaim reward"),
        "Streak": ("OK" if "streakDays" in src_content else "WARN",
                   "Safety streak feature"),
        "Radar Chart": ("OK" if "RadarChart" in src_content or "BibRadarChart" in src_content else "ERROR",
                        "BIB Radar Chart"),
        "Leaderboard": ("OK" if "LeaderboardSection" in src_content else "ERROR",
                        "Leaderboard section"),
        "Daily Quiz": ("OK" if "DailyQuestModal" in src_content else "ERROR",
                       "Daily quiz/kuis harian"),
        "Pre-Shift Checklist": ("OK" if "PreShiftChecklistModal" in src_content else "ERROR",
                                "Pre-shift inspection checklist"),
        "Reward Marketplace": ("OK" if "RewardMarketplace" in src_content else "ERROR",
                               "Reward marketplace / point store"),
        "Supervisor Console": ("OK" if "SupervisorConsole" in src_content else "ERROR",
                               "Supervisor audit console"),
        "PWA": ("WARN" if "vite-plugin-pwa" not in read(ROOT / "package.json") else "OK",
                "PWA support (vite-plugin-pwa)"),
        "Tier Progression": ("WARN" if "tier" in src_content and "calculateTier" not in src_content else "OK",
                             "Tier auto-calculation berdasarkan poin"),
        "Streak Multiplier": ("WARN" if "multiplier" not in src_content.lower() else "OK",
                              "Streak bonus multiplier (7/14/30 hari)"),
        "Realtime": ("WARN" if "subscribe" not in src_content else "OK",
                     "Supabase Realtime subscription"),
    }

    for feature, (level, desc) in features.items():
        add(level, "PRD_FEATURE", f"{desc} -- {'Implemented (v)' if level == 'OK' else 'BELUM diimplementasikan'}")


def check_sql_setup():
    """Pastikan supabase_setup.sql ada dan mengandung semua elemen penting."""
    sql_file = ROOT / "supabase_setup.sql"
    if not sql_file.exists():
        add("WARN", "SQL", "supabase_setup.sql tidak ditemukan. Schema mungkin belum di-deploy.")
        return

    content = sql_file.read_text()
    required = [
        ("CREATE TABLE.*workers", "Tabel workers"),
        ("CREATE TABLE.*reward_catalog", "Tabel reward_catalog"),
        ("CREATE TABLE.*redemption_history", "Tabel redemption_history"),
        ("increment_worker_points", "RPC increment_worker_points"),
        ("increment_worker_streak_and_points", "RPC increment_worker_streak_and_points"),
        ("deduct_worker_points", "RPC deduct_worker_points"),
        ("decrement_reward_stock", "RPC decrement_reward_stock"),
        ("ENABLE ROW LEVEL SECURITY", "Row Level Security"),
        ("INSERT INTO workers", "Seed data workers"),
        ("INSERT INTO reward_catalog", "Seed data reward_catalog"),
    ]
    for pattern, desc in required:
        if re.search(pattern, content, re.IGNORECASE):
            add("OK", "SQL", f"{desc} ada di supabase_setup.sql")
        else:
            add("WARN", "SQL", f"{desc} TIDAK ditemukan di supabase_setup.sql")


# ─── Runner ──────────────────────────────────────────────────────────────────

def run_all_checks(verbose=False, category_filter=None):
    check_env()
    check_gitignore()
    check_supabase_client()
    check_supabase_service()
    check_mock_data_usage()
    check_app_tsx()
    check_components()
    check_typescript()
    check_prd_features()
    check_sql_setup()

    # Filter
    filtered = results
    if category_filter:
        filtered = [r for r in results if r.category.lower() == category_filter.lower()]
    if not verbose:
        filtered = [r for r in filtered if r.level != "OK"]

    # Group by category
    categories = {}
    for r in filtered:
        categories.setdefault(r.category, []).append(r)

    print("\n" + "="*60)
    print("  BIB Platform — Checker Report")
    print("="*60)

    errors = [r for r in results if r.level == "ERROR"]
    warns  = [r for r in results if r.level == "WARN"]
    oks    = [r for r in results if r.level == "OK"]

    print(f"  Total: {len(results)} checks")
    print(f"  [ERROR] Errors  : {len(errors)}")
    print(f"  [WARN]  Warnings: {len(warns)}")
    print(f"  [OK]    Passed  : {len(oks)}")
    print()

    for cat, cat_results in categories.items():
        print(f"\n-- {cat} {'-'*(40-len(cat))}")
        for r in cat_results:
            print(str(r))

    print("\n" + "="*60)

    if errors:
        print(f"\n  [FAIL] {len(errors)} ERROR harus diperbaiki sebelum deploy.\n")
        sys.exit(1)
    elif warns:
        print(f"\n  [WARN] {len(warns)} peringatan -- review sebelum production.\n")
    else:
        print("\n  [PASS] Semua checks passed.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BIB Platform Code Checker")
    parser.add_argument("--verbose", action="store_true", help="Tampilkan semua checks termasuk yang OK")
    parser.add_argument("--category", type=str, help="Filter berdasarkan category (contoh: supabase, env, sql)")
    args = parser.parse_args()
    run_all_checks(verbose=args.verbose, category_filter=args.category)
