-- drop table usergames;
-- drop table games;
-- drop table users;
-- drop table diagnosticscores;

CREATE TABLE IF NOT EXISTS public.users
(
    userID serial primary key,
    username text,
    fname text,
    lname text,
    email text,
    password text,
    isdiagnostic boolean,
    dateCreated date
);


CREATE TABLE IF NOT EXISTS public.games
(
    gameID serial primary key,
    gname text,
    highscore integer,
    dateCreated date
);

CREATE TABLE IF NOT EXISTS public.usergames
(
    usergameID serial primary key,
    userID integer not null references users (userID) on delete cascade,
    gameID integer not null references games (gameID) on delete cascade,
    datePlayed date,
    score integer not null,
    highscore integer not null
);

CREATE TABLE IF NOT EXISTS public.diagnosticscores
(
    diagnosticID serial primary key,
    userID integer not null references users (userID) on delete cascade,
    Q1 bool,
    Q2 bool,
    Q3 bool,
    Q4 bool,
    Q5 bool,
    Q6 bool,
    Q7 bool,
    Q8 bool,
    Q9 bool,
    Q10 bool,
    Q11 bool,
    Q12 bool,
    Q13 bool,
    Q14 bool,
    Q15 bool,
    Q16 bool,
    Q17 bool,
    Q18 bool,
    Q19 bool,
    Q20 bool,
    dateAttempted date
);