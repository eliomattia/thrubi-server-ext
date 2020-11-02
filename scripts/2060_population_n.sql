
DROP PROCEDURE IF EXISTS update_population_n;
DELIMITER //
CREATE PROCEDURE update_population_n()
BEGIN
	DROP TABLE IF EXISTS t_population_n;
    CREATE TABLE t_population_n AS SELECT * FROM population_n;
    DELETE FROM t_population_n;
    INSERT INTO t_population_n
	SELECT DISTINCT p.population_id AS population_id,
			FIRST_VALUE(cn.n_population) OVER w AS latest_prioritized_population
	FROM country_n cn INNER JOIN population p ON cn.country_id=p.country_id
	WINDOW w AS (PARTITION BY p.population_id ORDER BY
				year DESC,
				CASE WHEN cn.datasource='IRS.gov' THEN 0 ELSE CASE WHEN cn.datasource='wid.world' THEN 1 ELSE 10 END END,
				CASE WHEN cn.variable_type='npopul999i' THEN 0 ELSE CASE WHEN cn.variable_type='npopul992i' THEN 1 ELSE 10 END END);
	INSERT INTO population_n SELECT population_id,n_population FROM t_population_n ON DUPLICATE KEY UPDATE population_n.n_population=t_population_n.n_population;
    DROP TABLE t_population_n;
END; //
DELIMITER ;

CALL update_population_n;

-- ZZ has negative population in the source data (check following data deliveries)
update population_n set n_population=-n_population where population_id=23;
update country_n set n_population=-n_population where country_id='ZZ';
