with open('backend/fetchers/maw_fetcher.py', 'r') as f:
    text = f.read()

text = text.replace(
    '''cur.executemany(
        f"""INSERT INTO cosmic_maw VALUES ({','.join(['%s']*37)})
            ON CONFLICT (time_tag) DO UPDATE SET
            nm_corrected=EXCLUDED.nm_corrected,
            nm_uncorrected=EXCLUDED.nm_uncorrected,
            pressure=EXCLUDED.pressure""",
        records
    )''',
    '''execute_values(
        cur,
        """INSERT INTO cosmic_maw VALUES %s
            ON CONFLICT (time_tag) DO UPDATE SET
            nm_corrected=EXCLUDED.nm_corrected,
            nm_uncorrected=EXCLUDED.nm_uncorrected,
            pressure=EXCLUDED.pressure""",
        records
    )'''
)

with open('backend/fetchers/maw_fetcher.py', 'w') as f:
    f.write(text)
print("MAW patched!")
