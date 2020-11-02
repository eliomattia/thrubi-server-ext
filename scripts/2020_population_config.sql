INSERT INTO population_config SELECT population_id,NULL,1,1,0,1 FROM population;
UPDATE population_config SET equality_multiplier=1.04;
UPDATE population_config pc INNER JOIN population p ON pc.population_id=p.population_id SET pc.imit=100000,pc.mincome_shifter=6000 WHERE p.country_id='US';
UPDATE population_config pc INNER JOIN population p ON pc.population_id=p.population_id SET pc.imit=50 WHERE p.country_id<>'US';
