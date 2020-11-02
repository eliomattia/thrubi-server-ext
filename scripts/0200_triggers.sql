-- trigger log the following
-- select * from user;  				-- selected fields, only update
-- select * from user_access;
-- select * from user_detail;
-- select * from population; 			-- selected fields
-- select * from population_config;
-- select * from ref;
-- select * from ref_stats;
-- select * from member; 				-- selected fields

DROP PROCEDURE IF EXISTS create_log_table;
DELIMITER //
CREATE PROCEDURE create_log_table(IN table_name VARCHAR(100))
BEGIN
	SET @logged_table = table_name;
    SET @log_table = concat("l_",table_name);
    SET @prep = concat("DROP TABLE IF EXISTS ",@log_table);
    PREPARE statement FROM @prep;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
    SET @prep = concat("CREATE TABLE ",@log_table," AS SELECT * FROM ",@logged_table);
    PREPARE statement FROM @prep;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
    SET @prep = concat("TRUNCATE TABLE ",@log_table);
    PREPARE statement FROM @prep;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
    SET @prep = concat("ALTER TABLE ",@log_table," ADD logger_time datetime FIRST");
    PREPARE statement FROM @prep;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
    SET @prep = concat("ALTER TABLE ",@log_table," ADD logger_action CHAR(1) AFTER logger_time");
    PREPARE statement FROM @prep;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
END; //
DELIMITER ;

CALL create_log_table("user");
CALL create_log_table("user_access");
CALL create_log_table("user_detail");
CALL create_log_table("population");
CALL create_log_table("population_config");
CALL create_log_table("ref");
CALL create_log_table("ref_stats");
CALL create_log_table("member");

ALTER TABLE l_user DROP COLUMN created;
ALTER TABLE l_user DROP COLUMN last_login;
ALTER TABLE l_population DROP COLUMN country_id;
ALTER TABLE l_population DROP COLUMN ccy_id;
ALTER TABLE l_population DROP COLUMN created;
ALTER TABLE l_population DROP COLUMN notes;
ALTER TABLE l_member DROP COLUMN vdate;
ALTER TABLE l_member DROP COLUMN thrubi_blue_eth;
ALTER TABLE l_member DROP COLUMN thrubi_blue;
ALTER TABLE l_member DROP COLUMN thrubi_blue_next;
ALTER TABLE l_member DROP COLUMN thrubi_blue_award;
ALTER TABLE l_member DROP COLUMN thrubi_blue_award_total;
ALTER TABLE l_member DROP COLUMN thrubi_blue_claim_total;
ALTER TABLE l_member DROP COLUMN thrubi_silver_eth;
ALTER TABLE l_member DROP COLUMN thrubi_silver;
ALTER TABLE l_member DROP COLUMN thrubi_silver_next;
ALTER TABLE l_member DROP COLUMN thrubi_silver_transform_total;
ALTER TABLE l_member DROP COLUMN thrubi_gold;



DROP TRIGGER IF EXISTS t_d_member;
DELIMITER //
CREATE TRIGGER t_d_member BEFORE DELETE ON member
FOR EACH ROW
BEGIN
	INSERT INTO l_member
	SET logger_time			=now(),
		logger_action		='D',
		user_id				=OLD.user_id,
		population_id		=OLD.population_id,
		n					=OLD.n,
		n_richer			=OLD.n_richer,
		n_poorer			=OLD.n_poorer,
		m_current			=OLD.m_current,
		thrubi_m			=OLD.thrubi_m,
		thrubi_mode			=OLD.thrubi_mode;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_u_member;
DELIMITER //
CREATE TRIGGER t_u_member BEFORE UPDATE ON member
FOR EACH ROW
BEGIN
	IF ((OLD.n<>NEW.n)
    OR (OLD.n_richer<>NEW.n_richer)
    OR (OLD.n_poorer<>NEW.n_poorer)
    OR (OLD.m_current<>NEW.m_current)
    OR (OLD.thrubi_m<>NEW.thrubi_m)
    OR (OLD.thrubi_mode<>NEW.thrubi_mode)) THEN
		INSERT INTO l_member
		SET logger_time			=now(),
			logger_action		='U',
			user_id				=OLD.user_id,
            population_id		=OLD.population_id,
            n					=OLD.n,
			n_richer			=OLD.n_richer,
			n_poorer			=OLD.n_poorer,
			m_current			=OLD.m_current,
			thrubi_m			=OLD.thrubi_m,
			thrubi_mode			=OLD.thrubi_mode;
	END IF;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_u_user;
DELIMITER //
CREATE TRIGGER t_u_user BEFORE UPDATE ON user
FOR EACH ROW
BEGIN
	IF ((OLD.user_role<>NEW.user_role)
    OR (OLD.pay_channel<>NEW.pay_channel)
    OR (OLD.email_verified<>NEW.email_verified)
    OR (OLD.identity_certified<>NEW.identity_certified)
    OR (OLD.income_approved<>NEW.income_approved)
    OR (OLD.deactivated<>NEW.deactivated)
    OR (OLD.closed<>NEW.closed)) THEN
		INSERT INTO l_user
		SET logger_time			=now(),
			logger_action		='U',
			user_id				=OLD.user_id,
			user_role			=OLD.user_role,
			pay_channel			=OLD.pay_channel,
			email_verified		=OLD.email_verified,
			identity_certified	=OLD.identity_certified,
			income_approved		=OLD.income_approved,
			deactivated			=OLD.deactivated,
			closed				=OLD.closed;
	END IF;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_d_user_access;
DELIMITER //
CREATE TRIGGER t_d_user_access BEFORE DELETE ON user_access
FOR EACH ROW
BEGIN
	INSERT INTO l_user_access
    SET logger_time		=now(),
		logger_action	='D',
        user_id			=OLD.user_id,
        access_id		=OLD.access_id,
        access_value	=OLD.access_value;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_u_user_access;
DELIMITER //
CREATE TRIGGER t_u_user_access BEFORE UPDATE ON user_access
FOR EACH ROW
BEGIN
	INSERT INTO l_user_access
    SET logger_time		=now(),
		logger_action	='U',
        user_id			=OLD.user_id,
        access_id		=OLD.access_id,
        access_value	=OLD.access_value;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_d_user_detail;
DELIMITER //
CREATE TRIGGER t_d_user_detail BEFORE DELETE ON user_detail
FOR EACH ROW
BEGIN
	INSERT INTO l_user_detail
    SET logger_time		=now(),
		logger_action	='D',
        user_id			=OLD.user_id,
        detail_id		=OLD.detail_id,
        detail_value	=OLD.detail_value;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_u_user_detail;
DELIMITER //
CREATE TRIGGER t_u_user_detail BEFORE UPDATE ON user_detail
FOR EACH ROW
BEGIN
	INSERT INTO l_user_detail
    SET logger_time		=now(),
		logger_action	='U',
        user_id			=OLD.user_id,
        detail_id		=OLD.detail_id,
        detail_value	=OLD.detail_value;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_d_population;
DELIMITER //
CREATE TRIGGER t_d_population BEFORE DELETE ON population
FOR EACH ROW
BEGIN
	INSERT INTO l_population
    SET logger_time		=now(),
		logger_action	='D',
        population_id	=OLD.population_id,
        lastchanged		=OLD.lastchanged,
        eth_balance		=OLD.eth_balance,
        eth_fees		=OLD.eth_fees;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_u_population;
DELIMITER //
CREATE TRIGGER t_u_population BEFORE UPDATE ON population
FOR EACH ROW
BEGIN
	IF ((OLD.lastchanged<>NEW.lastchanged)
    OR (OLD.eth_balance<>NEW.eth_balance)
    OR (OLD.eth_fees<>NEW.eth_fees)) THEN
		INSERT INTO l_population
		SET logger_time		=now(),
			logger_action	='U',
			population_id	=OLD.population_id,
			lastchanged		=OLD.lastchanged,
			eth_balance		=OLD.eth_balance,
			eth_fees		=OLD.eth_fees;
	END IF;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_d_population_config;
DELIMITER //
CREATE TRIGGER t_d_population_config BEFORE DELETE ON population_config
FOR EACH ROW
BEGIN
	INSERT INTO l_population_config
    SET logger_time		=now(),
		logger_action	='D',
        population_id		=OLD.population_id,
        imit				=OLD.imit,
        brake				=OLD.brake,
        mincome_multiplier	=OLD.mincome_multiplier,
        mincome_shifter		=OLD.mincome_shifter,
        equality_multiplier	=OLD.equality_multiplier;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_u_population_config;
DELIMITER //
CREATE TRIGGER t_u_population_config BEFORE UPDATE ON population_config
FOR EACH ROW
BEGIN
	INSERT INTO l_population_config
    SET logger_time		=now(),
		logger_action	='U',
        population_id		=OLD.population_id,
        imit				=OLD.imit,
        brake				=OLD.brake,
        mincome_multiplier	=OLD.mincome_multiplier,
        mincome_shifter		=OLD.mincome_shifter,
        equality_multiplier	=OLD.equality_multiplier;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_d_ref_stats;
DELIMITER //
CREATE TRIGGER t_d_ref_stats BEFORE DELETE ON ref_stats
FOR EACH ROW
BEGIN
	INSERT INTO l_ref_stats
    SET logger_time		=now(),
		logger_action	='D',
        population_id	=OLD.population_id,
        n_ref			=OLD.n_ref,
        n_population	=OLD.n_population,
        m				=OLD.m,
        m2				=OLD.m2,
        mlnn			=OLD.mlnn,
        lnn				=OLD.lnn,
        lnc				=OLD.lnc,
        a				=OLD.a,
        mincome			=OLD.mincome,
        equality 		=OLD.equality;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_u_ref_stats;
DELIMITER //
CREATE TRIGGER t_u_ref_stats BEFORE UPDATE ON ref_stats
FOR EACH ROW
BEGIN
	INSERT INTO l_ref_stats
    SET logger_time		=now(),
		logger_action	='U',
        population_id	=OLD.population_id,
        n_ref			=OLD.n_ref,
        n_population	=OLD.n_population,
        m				=OLD.m,
        m2				=OLD.m2,
        mlnn			=OLD.mlnn,
        lnn				=OLD.lnn,
        lnc				=OLD.lnc,
        a				=OLD.a,
        mincome			=OLD.mincome,
        equality 		=OLD.equality;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_d_ref;
DELIMITER //
CREATE TRIGGER t_d_ref BEFORE DELETE ON ref
FOR EACH ROW
BEGIN
	INSERT INTO l_ref
    SET logger_time		=now(),
		logger_action	='D',
        population_id	=OLD.population_id,
        n				=OLD.n,
        m				=OLD.m;
END; //
DELIMITER ;

DROP TRIGGER IF EXISTS t_u_ref;
DELIMITER //
CREATE TRIGGER t_u_ref BEFORE UPDATE ON ref
FOR EACH ROW
BEGIN
	INSERT INTO l_ref
    SET logger_time		=now(),
		logger_action	='U',
        population_id	=OLD.population_id,
        n				=OLD.n,
        m				=OLD.m;
END; //
DELIMITER ;