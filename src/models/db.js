const mysql = require("mysql2");
const user          = require("../config/user").user;
const messageBook   = require("../config/message").messageBook;
const access        = require("../config/access").access;

const q = async (expectedCardinality,params,sql) => {
    // 1: extract and return one (first) row, 0: return multiple rows or a single object
    let connectionSettings;
    if (process.env.NODE_ENV === "production") {
        connectionSettings = {
            uri:                process.env.JAWSDB_MAROON_URL,
            //waitForConnections: true,
            //connectionLimit:    10,
            //queueLimit:         0
        };
    } else {
        connectionSettings = {
            host:               process.env.DB_HOST,
            user:               process.env.DB_USER,
            port:               process.env.DB_PORT,
            password:           process.env.DB_PASSWORD,
            database:           process.env.DB_DATABASE,
            //waitForConnections: true,
            //connectionLimit:    10,
            //queueLimit:         0,
        };
    }
    const con = mysql.createConnection(connectionSettings);

    return new Promise((resolve,reject) => {
        try {
            con.execute(sql,params,(error,result) => {
                con.end();
                if (error) {
                    console.error(sql);
                    console.error(params);
                    console.error(error);
                    reject(messageBook.errorMessage.DB_SQL_ERROR);
                } else {
                    let sqlResult = expectedCardinality?(result[0]):result;
                    if ((!sqlResult)||(sqlResult==="[]")) {
                        reject(messageBook.errorMessage.DB_ELEMENT_NOT_FOUND);
                    } else {
                        resolve(sqlResult);
                    }
                }
            });
        } catch (error) {
            console.error(sql);
            console.error(params);
            console.error(error);
            reject(messageBook.errorMessage.DB_ERROR);
        }
    });
};

exports.guest = {
    subscribeNewsletter: guestEmail =>
        q(0,[guestEmail],
            `INSERT INTO guest_email VALUES (?,now()) ON DUPLICATE KEY UPDATE vdate=now();`),
    todaySuggestions: () =>
        q(1,[],
            `SELECT COUNT(*) AS 'todaySuggestions' FROM guest_suggestions WHERE  vdate between subdate(now(),1) and now();`),
    submitSuggestion: (suggestionType,country,suggestionText) =>
        q(0,[suggestionType,country,suggestionText],
            `INSERT INTO guest_suggestions VALUES (now(),?,?,?);`),
};

exports.actions = {
    log:          (userId,actionType,actionValue) =>
        q(0,[actionType,actionValue],
            `INSERT INTO actions VALUES(?,?,1) ON DUPLICATE KEY UPDATE action_count=action_count+1;`),
};

exports.traffic = {
    logIp:          ip =>
        q(0,[ip],
            `INSERT INTO ip VALUES(now(),?);`),
};

exports.country = {
    list:           () =>
        q(0,[],
            `SELECT country_id AS 'countryId',country_name AS 'countryName' FROM country;`),
};

exports.ccy = {
    list:           () =>
        q(0,[],
            `SELECT ccy_id AS 'ccyId',ccy_name AS 'ccyName',ccy_symbol AS 'ccySymbol' FROM ccy;`),
};

exports.user = {
    nextUserId:     () =>
        q(1,[],
            `SELECT IFNULL(MAX(user_id),0)+1 AS 'nextUserId' FROM user;`),
    n:              () =>
        q(1,[],
            `SELECT count(*) AS 'nUser' FROM user WHERE closed=0;`),
    create:         nextUserId =>
        q(0,[nextUserId,0,0,0,0,1,0,access.channelName.notAvailable],
            `INSERT INTO user
                    SELECT ?,?,now(),now(),channel_id,channel_id,?,?,?,?,?
                    FROM channel WHERE channel_name=?;`),
    read:           userId =>
        q(1,[userId,0],
            `SELECT 
                    user_id AS 'userId',
                    user_role AS 'userRole',
                    p.channel_name AS 'payChannel',          -- to be discussed whether pay/receive channels should stay out of login
                    r.channel_name AS 'receiveChannel'   -- to be discussed whether pay/receive channels should stay out of login
               FROM user INNER JOIN channel p ON user.pay_channel=p.channel_id INNER JOIN channel r ON user.receive_channel=r.channel_id
              WHERE user_id=? AND closed=?;`),
    getFlags:       userId =>
        q(1,[userId],
            `SELECT 
                    deactivated AS 'deactivated',
                    email_verified AS 'emailVerified',
                    identity_certified AS 'identityCertified',
                    income_approved AS 'incomeApproved'
               FROM user
              WHERE user_id=?;`),
    setFlag:        (userId,flag,value) =>
        q(0,[value,userId],
            (flag===user.flags.emailVerified)       ?`UPDATE user SET email_verified=? WHERE user_id=?;`
           :(flag===user.flags.identityCertified)   ?`UPDATE user SET identity_certified=? WHERE user_id=?;`
           :(flag===user.flags.incomeApproved)      ?`UPDATE user SET income_approved=? WHERE user_id=?;`
           :(flag===user.flags.deactivated)         ?`UPDATE user SET deactivated=? WHERE user_id=?;`:``),
    activate:       userId =>
        q(0,[userId],
            `UPDATE user SET deactivated=0 WHERE user_id=?;`),
    deactivate:     (userId,activationState) =>
        q(0,[activationState,userId],
            `UPDATE user SET deactivated=? WHERE user_id=?;`),
    close:          userId =>
        q(0,[userId],
            `UPDATE user SET closed=1 WHERE user_id=?;`),
    isClosed:       userId =>
        q(0,[userId],
            `SELECT closed AS 'isClosed' FROM user WHERE user_id=?;`),
    getDeactivated: userId =>
        q(0,[userId],
            `SELECT deactivated AS 'deactivated' FROM user WHERE user_id=?;`),
    fetchDetails:   userId =>
        q(0,[userId],
            `SELECT detail.detail_name AS 'detailName',user_detail.detail_value AS 'detailValue'
                    FROM user INNER JOIN user_detail
                    ON user.user_id=user_detail.user_id
                    INNER JOIN detail
                    ON detail.detail_id=user_detail.detail_id
                    WHERE user.user_id=?;`),
    deleteDetails:  userId =>
        q(0,[userId],
            `DELETE FROM user_detail
                    WHERE user_id=?;`),
    deleteDetail:   (userId,detailName) =>
        q(0,[userId,detailName],
            `DELETE user_detail
                    FROM user_detail
                    INNER JOIN detail
                    ON detail.detail_id=user_detail.detail_id
             WHERE user_id=? AND detail_name=?;`),
    hasDetail:      (userId,detailName) =>
        q(1,[userId,detailName],
            `SELECT count(*) AS 'hasDetail'
                    FROM user_detail
                    INNER JOIN detail
                    ON detail.detail_id=user_detail.detail_id
                    WHERE user_detail.user_id=?
                    AND detail.detail_name=?;`),
    updateDetail:   (userId,detailName,detailValue) =>
        q(0,[detailName,detailValue,userId],
            `UPDATE user_detail
                    INNER JOIN detail
                    ON detail.detail_id=user_detail.detail_id
                    AND detail.detail_name=?
                SET user_detail.detail_value=?
                    WHERE user_detail.user_id=?
                    AND detail.detail_id=user_detail.detail_id;`),
    insertDetail:   (userId,detailName,detailValue) =>
        q(0,[userId,detailValue,detailName],
            `INSERT INTO user_detail
                    SELECT ?,detail_id,?
                    FROM detail
                    WHERE detail_name=?;`),
    profilePictureUploads: userId =>
    q(1,[userId,user.detailName.profilePicture],
        `SELECT COUNT(*) AS 'profilePictureUploads'
                    FROM l_user_detail INNER JOIN detail ON l_user_detail.detail_id=detail.detail_id
                    WHERE user_id=? AND detail_name=?;`),
};

exports.userAccess = {
    login:          (channelName,accessName,accessValue) =>
        q(1,[channelName,accessName,accessValue],
            `SELECT user.user_id AS 'userId'
                    FROM user INNER JOIN user_access
                    ON user.user_id=user_access.user_id
                    INNER JOIN access
                    ON access.access_id=user_access.access_id
                    INNER JOIN channel
                    ON access.channel_id=channel.channel_id
                    AND channel.channel_name=?
                    AND access.access_name=?
                    WHERE user_access.access_value=?
                    AND user.closed=0;`),
    loginLast:     userId =>
        q(0,[userId],
                `UPDATE user
                 SET last_login=now()
                 WHERE user_id=?;`),
    loginTrack:     (userId,channelName,accessValue) =>
        q(0,[userId,accessValue,channelName],
                `INSERT INTO login 
                 SELECT ?,now(),channel_id,?
                 FROM channel WHERE channel_name=?;`),
    existsAccess:   (channelName,accessName,accessValue) =>
        q(1,[channelName,accessName,accessValue],
            `SELECT CASE WHEN count(*)=1 THEN true ELSE false END AS 'existsAccess'
                    FROM access INNER JOIN user_access
                    ON access.access_id=user_access.access_id
                    INNER JOIN channel
                    ON access.channel_id=channel.channel_id
                    WHERE channel.channel_name=?
                    AND access.access_name=?
                    AND user_access.access_value=?;`),
    getPayChannel:  userId =>
        q(1,[userId],
            `SELECT channel_name AS 'payChannel' FROM user INNER JOIN channel
                    ON user.pay_channel=channel.channel_id WHERE user_id=?;`),
    setPayChannel:  (userId,payChannel) =>
        q(0,[payChannel,userId],
            `UPDATE user SET pay_channel=? WHERE user_id=?;`),
    getReceiveChannel:  userId =>
        q(1,[userId],
                `SELECT channel_name AS 'receiveChannel' FROM user INNER JOIN channel
                                                                          ON user.receive_channel=channel.channel_id WHERE user_id=?;`),
    setReceiveChannel:  (userId,receiveChannel) =>
        q(0,[receiveChannel,userId],
                `UPDATE user SET receive_channel=? WHERE user_id=?;`),
    getChannel:     (channelName) =>
        q(1,[channelName],
            `SELECT channel_id AS 'channelId',channel_mode AS 'channelMode'
                    FROM channel WHERE channel_name=?;`),
    hasChannel:     (userId,channelName) =>
        q(1,[channelName,userId],
            `SELECT CASE WHEN count(*)>=1 THEN true ELSE false END AS 'hasChannel'
                    FROM access INNER JOIN user_access
                    ON access.access_id=user_access.access_id
                    INNER JOIN channel
                    ON access.channel_id=channel.channel_id
                    WHERE channel.channel_name=?
                    AND user_access.user_id=?;`),
    hasAccess:      (userId,channelName,accessName) =>
        q(1,[channelName,accessName,userId],
            `SELECT CASE WHEN count(*)=1 THEN true ELSE false END AS 'hasAccess'
                    FROM access INNER JOIN user_access
                    ON access.access_id=user_access.access_id
                    INNER JOIN channel
                    ON access.channel_id=channel.channel_id
                    WHERE channel.channel_name=?
                    AND access.access_name=?
                    AND user_access.user_id=?;`),
    getAccess:      (userId,channelName,accessName) =>
        q(1,[channelName,accessName,userId],
            `SELECT access_value AS 'accessValue'
                    FROM access INNER JOIN user_access
                    ON access.access_id=user_access.access_id
                    INNER JOIN channel
                    ON access.channel_id=channel.channel_id
                    WHERE channel.channel_name=?
                    AND access.access_name=?
                    AND user_access.user_id=?;`),
    addAccess:      (userId,channelName,accessName,accessValue) =>
        q(0,[userId,accessValue,channelName,accessName],
            `INSERT INTO user_access
                    SELECT ?,access.access_id,?
                    FROM access INNER JOIN channel
                    ON access.channel_id=channel.channel_id
                    WHERE channel.channel_name=?
                    AND access.access_name=?;`),
    updateAccess:   (userId,channelName,accessName,accessValue) =>
        q(0,[accessName,channelName,accessValue,userId],
            `UPDATE user_access LEFT JOIN access
                    ON user_access.access_id=access.access_id
                    AND access.access_name=?
                    INNER JOIN channel
                    ON access.channel_id=channel.channel_id
                    AND channel.channel_name=?
                    SET user_access.access_value=?
                    WHERE user_id=?;`),
    deleteChannel:  (userId,channelName) =>
        q(0,[userId,channelName],
            `DELETE user_access FROM user_access LEFT JOIN access
                    LEFT JOIN channel
                    ON access.channel_id=channel.channel_id
                    ON user_access.access_id=access.access_id
                    WHERE user_access.user_id=?
                    AND channel.channel_name=?;`),
    deleteAllChannels: userId =>
        q(0,[userId],
            `DELETE FROM user_access WHERE user_id=?;`),
    nLoginChannels: userId =>
        q(1,[userId],
            `SELECT COUNT(DISTINCT channel_name) AS 'nChannels'
                    FROM user_access INNER JOIN access
                    ON user_access.access_id=access.access_id
                    INNER JOIN channel
                    ON access.channel_id=channel.channel_id
                    WHERE user_id=?
                    AND MOD(channel.channel_mode,2)=1;`), //MySql of channelIsForLogin
    getUserRole:    userId =>
        q(0,[userId],
            `SELECT user_role AS 'userRole' FROM user WHERE user_id=?;`),
    listChannels:   () =>
        q(0,[access.channelName.notAvailable],
            `SELECT DISTINCT     channel.channel_name AS 'channelName',
                                -channel.channel_mode AS 'channelMode'
                    FROM access INNER JOIN channel
                    ON channel.channel_id=access.channel_id
                    AND channel.channel_name<>?;`),
    listUserChannels: userId =>
        q(0,[userId,access.channelName.notAvailable],
            `SELECT DISTINCT    channel.channel_name AS 'channelName',
                                CASE WHEN user_access.user_id IS NULL
                                THEN -channel.channel_mode ELSE channel.channel_mode END AS 'channelMode'
                    FROM (SELECT * FROM user_access WHERE user_access.user_id=?) AS user_access
                    RIGHT JOIN access
                    ON user_access.access_id=access.access_id
                    INNER JOIN channel
                    ON channel.channel_id=access.channel_id
                    AND channel.channel_name<>?;`),
};

exports.population = {
    nextPopulationId: () =>
        q(1,[],
            `SELECT IFNULL(MAX(population_id),0)+1 AS 'nextPopulationId' FROM population;`),
    nCountry:       () =>
        q(1,[],
            `SELECT count(*) AS 'nCountry' FROM (SELECT * FROM population GROUP BY country_id) a;`),
    nCcy:           () =>
        q(1,[],
            `SELECT count(*) AS 'nCcy' FROM (SELECT * FROM population GROUP BY ccy_id) a;`),
    exists:         (countryId,ccyId) =>
        q(1,[countryId,ccyId],
            `SELECT CASE WHEN count(*)=1 THEN true ELSE false END AS 'exists' FROM population 
             WHERE country_id=? AND ccy_id=?;`),
    create:         (populationId,countryId,ccyId) => // rewrite
        q(0,[populationId,countryId,ccyId,0.05,0,0,null],
            `INSERT INTO population VALUES (?,?,?,now(),now(),?,?,?,?);`),
    createConfig:   populationId =>// rewrite
        q(0,[populationId,null,1.00,1.00,0.00,1.04],
            `INSERT INTO population_config VALUES (?,?,?,?,?,?);`),
    createRef:      populationId =>// rewrite
        q(0,[populationId],
            `INSERT INTO ref SELECT ?,n,m FROM ref WHERE population_id=1;`),
    createStats:    populationId =>// rewrite
        q(0,[populationId],
            `insert into ref_stats
             select r.population_id,
                    count(*)       n_ref,
                    max(n)         n_population,
                    sum(m)         m,
                    sum(m * m)     m2,
                    sum(m * ln(n)) mlnn,
                    sum(ln(n))     lnn,
                    null           lnc,
                    null           a,
                    null           mincome,
                    null           equality
             from ref r
             inner join population_config c
             on r.population_id=c.population_id
             where r.population_id=?
               and m<=imit
             group by population_id;`),
    computeC:       populationId =>
        q(0,[populationId],
            `UPDATE ref_stats SET lnc = (lnn*m2 - m*mlnn) / (n_ref*m2 - m*m) WHERE population_id=?;`),
    computeA:       populationId =>
        q(0,[populationId],
            `UPDATE ref_stats SET a = (n_ref*mlnn - m*lnn) / (n_ref*m2 - m*m) WHERE population_id=?;`),
    computeEquality:populationId =>
        q(0,[populationId],
            `UPDATE ref_stats SET equality = - 1000000*a WHERE population_id=?;`),
    computeMincome: populationId =>
        q(0,[populationId],
            `UPDATE ref_stats SET mincome = (ln(n_population)-lnc)/a WHERE population_id=?;`),
    deleteMember:   populationId =>
        q(0,[populationId],
            `DELETE FROM member WHERE population_id=?;`),
    deleteRef:      populationId =>
        q(0,[populationId],
            `DELETE FROM ref WHERE population_id=?;`),
    deleteConfig:   populationId =>
        q(0,[populationId],
            `DELETE FROM population_config WHERE population_id=?;`),
    deleteStats:    populationId =>
        q(0,[populationId], 
            `DELETE FROM ref_stats WHERE population_id=?;`),
    delete:         populationId =>
        q(0,[populationId],
            `DELETE FROM population WHERE population_id=?;`),
    n:              () =>
        q(1,[],
            `SELECT count(*) AS 'nPopulation' FROM population;`),
    read:           populationId =>
        q(1,[populationId],
            `SELECT a.population_id AS 'populationId',
                    a.thrubi_fees AS 'thrubiFees',
                    a.eth_balance AS 'ethBalance',
                    a.eth_fees AS 'ethFees',
                    b.ccy_id AS 'ccyId',
                    b.ccy_name AS 'ccyName',
                    b.ccy_symbol AS 'ccySymbol',
                    c.country_id AS 'countryId',
                    c.country_name AS 'countryName'
             FROM population a
             INNER JOIN ccy b ON a.ccy_id=b.ccy_id
             INNER JOIN country c ON a.country_id=c.country_id
             WHERE a.population_id=?;`),
    enumerate:      i =>
        q(1,[i-1],
            `SELECT a.population_id AS 'populationId',
                    a.thrubi_fees AS 'thrubiFees',
                    a.eth_balance AS 'ethBalance',
                    a.eth_fees AS 'ethFees',
                    b.ccy_id AS 'ccyId',
                    b.ccy_name AS 'ccyName',
                    b.ccy_symbol AS 'ccySymbol',
                    c.country_id AS 'countryId',
                    c.country_name AS 'countryName'
             FROM population a
             INNER JOIN ccy b ON a.ccy_id=b.ccy_id
             INNER JOIN country c ON a.country_id=c.country_id
             ORDER BY a.population_id
             LIMIT ?,1;`),
    forUser:        userId =>
        q(0,[userId,userId],
            `SELECT a.population_id AS 'populationId',
                    b.ccy_id AS 'ccyId',
                    b.ccy_name AS 'ccyName',
                    b.ccy_symbol AS 'ccySymbol',
                    c.country_id AS 'countryId',
                    c.country_name AS 'countryName',
                    CASE WHEN d.user_id IS NOT NULL THEN CASE WHEN d.user_id=? THEN 1 ELSE 0 END ELSE 0 END AS 'isMember' 
             FROM population a
             INNER JOIN ccy b ON a.ccy_id=b.ccy_id
             INNER JOIN country c ON a.country_id=c.country_id AND c.country_name<>'[undefined_country]'
             LEFT JOIN member d ON a.population_id=d.population_id AND d.user_id=?
             ORDER BY isMember DESC,a.country_id,a.ccy_id;`),
    readStats:      populationId =>
        q(1,[populationId],
            `SELECT n_ref AS 'nRef',n_population AS 'nPopulation',mincome AS 'mincome',equality AS 'equality' FROM ref_stats WHERE population_id=?;`),
    readConfig:     populationId =>
        q(1,[populationId],
            `SELECT imit AS 'imit',
                    brake AS 'brake',
                    mincome_multiplier AS 'mincomeMultiplier',
                    mincome_shifter AS 'mincomeShifter',
                    equality_multiplier AS 'equalityMultiplier'
             FROM population_config WHERE population_id=?;`),
    changeConfig:   (populationId,imit,brake,mincomeMultiplier,mincomeShifter,equalityMultiplier) =>
        q(0,[imit,brake,mincomeMultiplier,mincomeShifter,equalityMultiplier,populationId],
            `UPDATE population_config SET 
                    imit=?,
                    brake=?,
                    mincome_multiplier=?,
                    mincome_shifter=?,
                    equality_multiplier=?
             WHERE population_id=?;`),
    blueTotal:      populationId =>
        q(1,[populationId],
            `SELECT IFNULL(sum(thrubi_blue),0) AS 'blueTotal' FROM member WHERE population_id=?;`),
    thrubiPriceSilver: populationId =>
        q(1,[populationId],
            `SELECT CASE WHEN sum(thrubi_silver)=0 THEN 0 ELSE sum(thrubi_blue)/sum(thrubi_silver) END AS 'thrubiPriceSilver'
             FROM member WHERE population_id=?;`),
    thrubiPriceSilverNext: populationId =>
        q(1,[populationId],
            `SELECT CASE WHEN sum(thrubi_silver_next)=0 THEN 0 ELSE sum(thrubi_blue_next)/sum(thrubi_silver_next) END AS 'thrubiPriceSilverNext'
             FROM member WHERE population_id=?;`),
    payEth:        (populationId,eth,ethFees) =>
        q(0,[eth,ethFees,populationId],
            `UPDATE population SET eth_balance=eth_balance+?,eth_fees=eth_fees+? WHERE population_id=?;`),
    chargeEth:     populationId =>
        q(0,[populationId],
            `UPDATE population SET eth_balance=0 WHERE population_id=?;`),
};

exports.ref = {
    list:       () =>
        q(0,[],
            `SELECT DISTINCT
                p.population_id AS 'populationId',
                b.ccy_id AS 'ccyId',
                b.ccy_name AS 'ccyName',
                b.ccy_symbol AS 'ccySymbol',
                c.country_id AS 'countryId',
                c.country_name AS 'countryName'
             FROM ref r
                      INNER JOIN population p ON r.population_id=p.population_id
                      INNER JOIN population_n n ON r.population_id=n.population_id
                      INNER JOIN ccy b ON p.ccy_id=b.ccy_id
                      INNER JOIN country c ON p.country_id=c.country_id AND c.country_name<>'[undefined_country]'
             ORDER BY 6;`),
    fetch:      populationId =>
        q(0,["US",100,populationId],
                `SELECT CASE WHEN p.country_id=? THEN r.n ELSE r.n*n.n_population/? END AS n,m
                 FROM ref r
                          INNER JOIN population p ON r.population_id=p.population_id
                          INNER JOIN population_n n ON r.population_id=n.population_id
                 WHERE r.population_id=?
                 ORDER BY 1 DESC;`),
    compare:        (populationId,income,richer) =>
        q(1,[populationId,income],richer
            ? `SELECT * FROM ref WHERE population_id=? AND m>=? ORDER BY n DESC LIMIT 1;`
            : `SELECT * FROM ref WHERE population_id=? AND m<=? ORDER BY n LIMIT 1;`),
    compareStrict:        (populationId,income,richer) =>
        q(1,[populationId,income],richer
            ? `SELECT * FROM ref WHERE population_id=? AND m>? ORDER BY n DESC LIMIT 1;`
            : `SELECT * FROM ref WHERE population_id=? AND m<? ORDER BY n LIMIT 1;`),
};

exports.member = {
    n:              populationId =>
        q(1,[populationId],
            `SELECT count(*) AS 'nMember' FROM member WHERE population_id=?;`),
    create:         (userId,populationId) =>
        q(0,[userId,populationId],
            `INSERT INTO member VALUES (?,?,now(),-1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);`),
    delete:         (userId,populationId) =>
        q(0,[userId,populationId],
            `DELETE FROM member WHERE user_id=? AND population_id=?;`),
    massCreate:     populationId =>
        q(0,[populationId],
            `INSERT INTO member 
             SELECT a.user_id,?,now(),b.m,b.n,b.n,b.n,0,0,0,0,0,0,0,0,0,0,0,0,0 
             FROM user a INNER JOIN ref b ON a.user_id=b.n AND b.population_id=1;`),
    read:           (userId,populationId) =>
        q(1,[userId,populationId],
            `SELECT 
                user_id AS 'userId',
                population_id AS 'populationId',
                vdate AS 'vdate',
                n AS 'n',
                m_current AS 'mCurrent',
                thrubi_m AS 'thrubiM',
                thrubi_mode AS 'thrubiMode',
                thrubi_blue_eth AS 'thrubiBlueEth',
                thrubi_blue AS 'thrubiBlue',
                thrubi_blue_next AS 'thrubiBlueNext',
                thrubi_blue_award AS 'thrubiBlueAward',
                thrubi_blue_award_total AS 'thrubiBlueAwardTotal',
                thrubi_blue_claim_total AS 'thrubiBlueClaimTotal',
                thrubi_silver_eth AS 'thrubiSilverEth',
                thrubi_silver AS 'thrubiSilver',
                thrubi_silver_next AS 'thrubiSilverNext',
                thrubi_silver_transform_total AS 'thrubiSilverTransformTotal',
                thrubi_gold AS 'thrubiGold' 
             FROM member WHERE user_id=? AND population_id=?;`),
    enumerate:      (populationId,j) =>
        q(1,[populationId,j-1],
            `SELECT 
                user_id AS 'userId',
                population_id AS 'populationId',
                vdate AS 'vdate',
                n AS 'n',
                m_current AS 'mCurrent',
                thrubi_m AS 'thrubiM',
                thrubi_mode AS 'thrubiMode',
                thrubi_blue_eth AS 'thrubiBlueEth',
                thrubi_blue AS 'thrubiBlue',
                thrubi_blue_next AS 'thrubiBlueNext',
                thrubi_blue_award AS 'thrubiBlueAward',
                thrubi_blue_award_total AS 'thrubiBlueAwardTotal',
                thrubi_blue_claim_total AS 'thrubiBlueClaimTotal',
                thrubi_silver_eth AS 'thrubiSilverEth',
                thrubi_silver AS 'thrubiSilver',
                thrubi_silver_next AS 'thrubiSilverNext',
                thrubi_silver_transform_total AS 'thrubiSilverTransformTotal',
                thrubi_gold AS 'thrubiGold' 
             FROM member WHERE population_id=? 
             ORDER BY user_id 
             LIMIT ?,1;`),
    declareIncome:  (userId,populationId,mCurrent) =>
        q(0,[mCurrent,userId,populationId],
            `UPDATE member 
             SET vdate=now(),
                 m_current=?
             WHERE user_id=? AND population_id=?;`),
    positionMember: (userId,populationId,n,nRicher,nPoorer) =>
        q(0,[n,(nRicher?nRicher:null),(nPoorer?nPoorer:null),userId,populationId],
            `UPDATE member 
             SET vdate=now(),
                 n=?,
                 n_richer=?,
                 n_poorer=?
             WHERE user_id=? AND population_id=?;`),
    computeThrubiM: (userId,populationId,massMode) =>
        q(0,massMode?[populationId]:[userId,populationId],massMode
           ?`UPDATE member 
             INNER JOIN ref_stats stats 
             ON member.population_id=stats.population_id 
             INNER JOIN population_config config 
             ON member.population_id=config.population_id 
             SET vdate=now(),
                 thrubi_m=-1e6*log(member.n/stats.n_population)/(stats.equality*config.equality_multiplier)
                              +(stats.mincome*config.mincome_multiplier+config.mincome_shifter)
             WHERE member.population_id=?;`
           :`UPDATE member 
             INNER JOIN ref_stats stats 
             ON member.population_id=stats.population_id 
             INNER JOIN population_config config 
             ON member.population_id=config.population_id 
             SET vdate=now(),
                 thrubi_m=-1e6*log(member.n/stats.n_population)/(stats.equality*config.equality_multiplier)
                              +(stats.mincome*config.mincome_multiplier+config.mincome_shifter)
             WHERE user_id=? AND member.population_id=?;`),
    computeThrubiMode: (userId,populationId,massMode) =>
        q(0,massMode?[populationId]:[userId,populationId],massMode
           ?`UPDATE member 
             SET vdate=now(),
                 thrubi_mode=CASE WHEN (thrubi_m-m_current)>0 THEN 1 ELSE 10 END 
             WHERE population_id=?;`
           :`UPDATE member 
             SET vdate=now(),
                 thrubi_mode=CASE WHEN (thrubi_m-m_current)>0 THEN 1 ELSE 10 END 
             WHERE user_id=? AND population_id=?;`),
    computeThrubiNext: (userId,populationId,massMode) =>
        q(0,massMode?[populationId]:[userId,populationId],massMode
           ?`UPDATE member 
             SET vdate=now(),
                 thrubi_blue_next=CASE WHEN thrubi_mode=1 THEN (thrubi_m-m_current) ELSE 0 END,
                 thrubi_silver_next=CASE WHEN thrubi_mode=10 THEN -(thrubi_m-m_current) ELSE 0 END
             WHERE population_id=?;`
           :`UPDATE member 
             SET vdate=now(),
                 thrubi_blue_next=CASE WHEN thrubi_mode=1 THEN (thrubi_m-m_current) ELSE 0 END,
                 thrubi_silver_next=CASE WHEN thrubi_mode=10 THEN -(thrubi_m-m_current) ELSE 0 END
             WHERE user_id=? AND population_id=?;`),
    distributeThrubi: () =>
        q(0,[],
            `UPDATE member a 
             INNER JOIN population_config b ON a.population_id=b.population_id 
             SET a.thrubi_blue=a.thrubi_blue_next*b.brake,       -- braking will need to be replaced with a registration date based mechanism
                 a.thrubi_silver=a.thrubi_silver_next*b.brake    -- braking will need to be replaced with a registration date based mechanism
             WHERE a.population_id>0 AND a.user_id IN (SELECT user_id FROM user WHERE deactivated=0);`),
    zeroThrubi: () =>
        q(0,[],
            `UPDATE member a
             INNER JOIN population_config b ON a.population_id=b.population_id
             SET a.thrubi_blue=0,
                 a.thrubi_silver=0 
             WHERE a.population_id>0 AND a.user_id IN (SELECT user_id FROM user WHERE deactivated>0);`),
    transformEth:   (userId,populationId,ethAmount) =>
        q(0,[ethAmount,userId,populationId],
            `UPDATE member 
             SET thrubi_silver_eth=thrubi_silver_eth+? 
             WHERE user_id=? AND population_id=?;`),
    transformSilver:(userId,populationId,silver,eth,spendAll,exrate) =>
        q(0,spendAll?[silver,silver,eth,exrate,userId,populationId]:[silver,silver,eth,eth,exrate,userId,populationId],spendAll
           ?`UPDATE member 
             SET thrubi_silver=thrubi_silver-?,
                 thrubi_gold=thrubi_gold+?,
                 thrubi_silver_eth=0,
                 thrubi_silver_transform_total=thrubi_silver_transform_total+?*? 
             WHERE user_id=? AND population_id=?;`
           :`UPDATE member 
             SET thrubi_silver=thrubi_silver-?,
                 thrubi_gold=thrubi_gold+?,
                 thrubi_silver_eth=thrubi_silver_eth-?,
                 thrubi_silver_transform_total=thrubi_silver_transform_total+?*? 
             WHERE user_id=? AND population_id=?;`),
    awardEth:       (populationId,ethBalance,blueTotal,exrate) =>
        q(0,[(blueTotal?ethBalance/blueTotal:0),(blueTotal?ethBalance/blueTotal:0),exrate,populationId],
            `UPDATE member 
             SET thrubi_blue_eth=thrubi_blue_eth+thrubi_blue*?,
                 thrubi_blue_award=thrubi_blue_award+thrubi_blue*?*? 
             WHERE population_id=?;`),
    claimEth:       (userId,populationId,exrate) =>
        q(0,[exrate,userId,populationId],
            `UPDATE member 
             SET thrubi_blue_claim_total=thrubi_blue_claim_total+thrubi_blue_eth*?,
                 thrubi_blue_award_total=thrubi_blue_award_total+thrubi_blue_award,
                 thrubi_blue_award=0,
                 thrubi_blue_eth=0 
             WHERE user_id=? AND population_id=?;`),
};