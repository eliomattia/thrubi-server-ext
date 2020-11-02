delete from ref_stats;

 -- check: max(n) right now, with m>0, excludes some values and gives 99 instead of 100.
 -- what does it mean? is that the mincome value and what happens when calculating incomes between 99 and 100?
insert into ref_stats
select
	r.population_id, 
    count(*) n_ref,
    max(n) n_population,
    sum(m) m,
    sum(m*m) m2,
    sum(m*ln(n)) mlnn,
    sum(ln(n)) lnn,
    null lnc,
    null a,
    null mincome,
    null equality
from ref r
inner join population_config c
on r.population_id=c.population_id
where r.population_id>0
and m>0
and m<=imit
group by population_id;

update ref_stats set lnc = (lnn*m2 - m*mlnn) / (n_ref*m2 - m*m) where population_id>0;
update ref_stats set a = (n_ref*mlnn - m*lnn) / (n_ref*m2 - m*m) where population_id>0;
update ref_stats set equality = - 1000000 * a where population_id>0;
update ref_stats set mincome = (ln(n_population)-lnc)*(-1000000)/equality where population_id>0;