UPDATE population_config pc
INNER JOIN population p ON pc.population_id=p.population_id AND p.country_id<>'US'
INNER JOIN ref ON pc.population_id=ref.population_id AND ref.n=50
SET pc.imit=ref.m;

UPDATE population_config pc
INNER JOIN population p ON pc.population_id=p.population_id AND p.country_id<>'US'
INNER JOIN ref ON pc.population_id=ref.population_id AND ref.n=95
SET pc.mincome_shifter=ref.m;