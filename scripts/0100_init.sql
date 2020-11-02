create table xc (
	vdate datetime,
    eventtype varchar(50),
    returned_sqlstate varchar(1000),
    message varchar(1000)
);
create table config (
    config_id varchar(50),
    val_int int,
    val_double double,
    val_char varchar(50)
);
alter table config add constraint pk_config primary key (config_id);
create table actions (
    action_type varchar(50),
    action_value varchar(50),
    action_count bigint
);
alter table actions add constraint pk_actions primary key (action_type,action_value);
create table guest_email (
	guest_email varchar(200),
    vdate datetime
);
alter table guest_email add constraint pk_guest_email primary key (guest_email);
create table guest_suggestions (
    vdate datetime,
    suggestion_type varchar(30),
	country varchar(100),
    suggestion_text varchar(500)
);
alter table guest_suggestions add constraint pk_guest_suggestions primary key (vdate,suggestion_type,country,suggestion_text);
create table country (
	country_id char(10),
    country_name varchar(100)
);
alter table country add constraint pk_country primary key (country_id);
create table country_n (
	country_id char(10),
    year int,
    datasource varchar(50),
    variable_type varchar(500),
    n_population bigint
);
alter table country_n add constraint pk_country_n primary key (country_id,year,datasource,variable_type);
alter table country_n add constraint fk_country_n_id foreign key (country_id) references country(country_id);
create table ccy (
	ccy_id char(3),
    ccy_name varchar(100),
    ccy_symbol varchar(5)
);
alter table ccy add constraint pk_ccy primary key (ccy_id);
create table population (
	population_id int,
    country_id char(10),
    ccy_id char(3),
    created datetime,
    lastchanged datetime,
    thrubi_fees double,
    eth_balance double,
    eth_fees double,
    notes varchar(500)
);
alter table population add constraint pk_population primary key (population_id);
alter table population add constraint u_population_one_ccy_per_country unique (country_id);  -- to be removed later as deemed necessary by R&D
alter table population add constraint u_population unique (country_id,ccy_id);
alter table population add constraint fk_population_country foreign key (country_id) references country(country_id);
alter table population add constraint fk_population_ccy foreign key (ccy_id) references ccy(ccy_id);
create table population_config (
	population_id int,
    imit double,
    brake double,
    mincome_multiplier double,
    mincome_shifter double,
    equality_multiplier double
);
alter table population_config add constraint pk_population_config primary key (population_id);
alter table population_config add constraint fk_population_config_id foreign key (population_id) references population(population_id);
create table ref_stats (
	population_id int,
    n_ref bigint,
    n_population bigint,
    m double,
    m2 double,
    mlnn double,
    lnn double,
    lnc double,
    a double,
    mincome double,
    equality double
);
alter table ref_stats add constraint pk_ref_stats primary key (population_id);
alter table ref_stats add constraint fk_ref_stats_id foreign key (population_id) references population(population_id);
create table population_n (
	population_id int,
    n_population bigint
);
alter table population_n add constraint pk_population_n primary key (population_id);
alter table population_n add constraint fk_population_n_id foreign key (population_id) references population(population_id);
create table fit_sim (
	fit_sim_time datetime,
    population_id int,
    n double,
    blue double,
    silver double
);
alter table fit_sim add constraint pk_fit_sim primary key (fit_sim_time,population_id,n);
create table ext_ref (
	country_id char(10),
    year int,
    n double,
    datasource varchar(50),
    variable_type varchar(500),
    m double
);
alter table ext_ref add constraint pk_ext_ref primary key (country_id,year,n,datasource,variable_type);
create table ref (
	population_id int,
    n double,
    m double
);
alter table ref add constraint pk_ref primary key (population_id,n);
create index i_ref on ref(population_id,m);
alter table ref add constraint fk_ref_population foreign key (population_id) references population(population_id);
create table channel (
	channel_id int,
    channel_name varchar(50),
    channel_mode int
);
alter table channel add constraint pk_channel primary key (channel_id);
create table access (
	access_id int,
    channel_id int,
    access_name varchar(50)
);
alter table access add constraint pk_access primary key (access_id);
alter table access add constraint u_access unique (channel_id,access_name);
create table user (
	user_id bigint,
    user_role int,
    created datetime,
    last_login datetime,
    pay_channel int,
    receive_channel int,
    email_verified int,
    identity_certified int,
    income_approved int,
    deactivated int,
    closed int
);
alter table user add constraint pk_user primary key (user_id);
alter table user add constraint fk_user_pay_channel foreign key (pay_channel) references channel(channel_id);
create table detail (
	detail_id int,
    detail_name varchar(30)
);
alter table detail add constraint pk_detail primary key (detail_id);
alter table detail add constraint u_detail unique (detail_name);
create table user_detail (
	user_id bigint,
    detail_id int,
    detail_value varchar(500)
);
alter table user_detail add constraint pk_user_detail primary key (user_id,detail_id);
alter table user_detail add constraint fk_user_detail_user foreign key (user_id) references user(user_id);
create table user_access (
	user_id bigint,
    access_id int,
    access_value varchar(200)
);
alter table user_access add constraint pk_user_access primary key (user_id,access_id);
alter table user_access add constraint u_user_access unique (access_id,access_value);
alter table user_access add constraint fk_user_access_user foreign key (user_id) references user(user_id);
create table login (
	user_id bigint,
    login_time datetime,
    channel_id int,
    access_value varchar(200)
);
alter table login add constraint pk_login primary key (user_id,login_time);
alter table login add constraint fk_login_channel foreign key (channel_id) references channel(channel_id);
create table ip (
	log_time datetime,
    ip varchar(200)
);
create table member (
	user_id bigint,
    population_id int,
    vdate datetime,
    n double,
    n_richer double,
    n_poorer double,
    m_current double,
    thrubi_m double,
    thrubi_mode int, -- 0: inactive, 1: blue, 10: silver, 100: gold
    thrubi_blue_eth double,
    thrubi_blue double,
    thrubi_blue_next double,
    thrubi_blue_award double,
    thrubi_blue_award_total double,
    thrubi_blue_claim_total double,
    thrubi_silver_eth double,
    thrubi_silver double,
    thrubi_silver_next double,
    thrubi_silver_transform_total double,
    thrubi_gold double
);
alter table member add constraint pk_member primary key (user_id,population_id);
alter table member add constraint fk_member_user foreign key (user_id) references user(user_id);
alter table member add constraint fk_member_population foreign key (population_id) references population(population_id);
commit;