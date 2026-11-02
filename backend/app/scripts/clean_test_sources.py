import sqlite3

def clean_sources():
    conn = sqlite3.connect("nexus_pulse.db")
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM sources 
        WHERE id LIKE 'due-src-%' 
           OR id LIKE 'test-crawl-src-%' 
           OR (id LIKE 'src-uet-%' AND id != 'src-uet-01') 
           OR (id LIKE 'src-kpitb-%' AND id != 'src-02')
    """)
    conn.commit()
    print("Cleaned test sources:", cur.rowcount)
    
    # Also update NCCS source id to src-nccs-01 so frontend and backend match perfectly
    cur.execute("""
        UPDATE sources 
        SET id = 'src-nccs-01' 
        WHERE url = 'https://pakistancybersecuritychallenge.nccs.pk'
    """)
    conn.commit()
    print("Updated NCCS source to src-nccs-01:", cur.rowcount)
    
    cur.execute("SELECT id, name, url FROM sources")
    rows = cur.fetchall()
    print("\nActive verified sources in database:")
    for r in rows:
        print(f"  [{r[0]}] {r[1]} -> {r[2]}")
    conn.close()

if __name__ == "__main__":
    clean_sources()
