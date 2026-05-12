UPDATE public.handlers
SET callsign = 'MAJ HOUSTON, R.',
    full_name = 'MAJ Houston, R.',
    unit = 'TF-7 / S2',
    aor = 'Reynosa Sector';

UPDATE public.sources_operational SET aor = 'Reynosa Sector', source_type = 'ci'        WHERE pseudonym = 'S-7421';
UPDATE public.sources_operational SET aor = 'Nuevo Laredo',  source_type = 'sensitive' WHERE pseudonym = 'S-3892';
UPDATE public.sources_operational SET aor = 'Monterrey Metro', source_type = 'ci'      WHERE pseudonym = 'S-1156';
UPDATE public.sources_operational SET aor = 'Reynosa Sector', source_type = 'casual', status = 'cold', reliability = 'C' WHERE pseudonym = 'S-4407';