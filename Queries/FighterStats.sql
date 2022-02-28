with 
W as (Select FightResults.Who_Won as Fighter, Count(FightResults.id) as Wins, FighterTier.Tier_Name as Tier, Max(FightResults.Match_Date) as LastFight
from FightResults
inner join MatchType ON
FightResults.Match_Type = MatchType.id
inner join FighterTier on
FightResults.Tier = FighterTier.id
where MatchType.Match_Name in ("matchmaking","tournament")
group by FightResults.Who_Won, FighterTier.Tier_Name
order by FightResults.Who_Won
),

WinList as (
Select FightResults.Fighter_1 as Fighter, FightResults.Fighter_1_Streak as Streak, FightResults.Match_Date
from FightResults
inner join MatchType ON
FightResults.Match_Type = MatchType.id
where MatchType.Match_Name in ("matchmaking","tournament") and
FightResults.Fighter_1 = FightResults.Who_Won

Union All

Select FightResults.Fighter_2 as Fighter, FightResults.Fighter_2_Streak as Streak, FightResults.Match_Date
from FightResults
inner join MatchType ON
FightResults.Match_Type = MatchType.id
where MatchType.Match_Name in ("matchmaking","tournament") and
FightResults.Fighter_2 = FightResults.Who_Won
),

WFinal as(Select W.Fighter, W.Wins, W.Tier, W.LastFight, IF(WinList.Streak < 0, 1, WinList.Streak + 1) as Current_Streak
from W
Inner Join WinList on
W.Fighter = WinList.Fighter and
W.LastFight = WinList.Match_Date
order by W.Fighter
),

L as (Select FightResults.Fighter_1 as Fighter, FighterTier.Tier_Name as Tier, FightResults.Match_Date, FightResults.Fighter_1_Streak as Streak
from FightResults
inner join MatchType ON
FightResults.Match_Type = MatchType.id
inner join FighterTier on
FightResults.Tier = FighterTier.id
where FightResults.Fighter_1 <> FightResults.Who_Won and 
      MatchType.Match_Name in ("matchmaking","tournament")


       union all

Select FightResults.Fighter_2 as Fighter, FighterTier.Tier_Name as Tier, FightResults.Match_Date, FightResults.Fighter_2_Streak as Streak
from FightResults
inner join MatchType ON
FightResults.Match_Type = MatchType.id
inner join FighterTier on
FightResults.Tier = FighterTier.id
where FightResults.Fighter_2 <> FightResults.Who_Won and 
      MatchType.Match_Name in ("matchmaking","tournament")
),

L2 as(Select L.Fighter, count(L.Fighter) as losses, L.Tier, Max(L.Match_Date) as LastFight
from L
group by L.Fighter, L.Tier
Order by L.Fighter
),

LFinal as (Select L2.Fighter, L2.losses, L2.Tier, L2.LastFight, IF(L.Streak >= 0,-1,L.Streak - 1) as Current_Streak
from L2
Inner Join L on
L2.Fighter = L.Fighter and
L2.LastFight = L.Match_Date
),
ML as (
  Select Fighters.id, Fighters.Name, WFinal.Tier
  from Fighters
  inner join WFinal on
  Fighters.id = WFinal.Fighter 
  Group by Fighters.id, WFinal.Tier

  Union All

Select Fighters.id, Fighters.Name, LFinal.Tier
  from Fighters
  inner join LFinal on
  Fighters.id = LFinal.Fighter
),
MasterList as(
Select ML.id,ML.Name, ML.Tier
from ML
group by ML.id, ML.Name, ML.Tier
)

select MasterList.id, MasterList.Name, COALESCE(WFinal.Wins,0) as win, COALESCE(LFinal.losses,0) as lose, (COALESCE(WFinal.Wins,0) / (COALESCE(LFinal.losses,0) + COALESCE(WFinal.Wins,0))) * 100 as rate, MasterList.Tier,

IF(COALESCE(WFinal.LastFight,"1999-01-01 00:00:00") > COALESCE(LFinal.LastFight,"1999-01-01 00:00:00"),
   COALESCE(WFinal.LastFight,"1999-01-01 00:00:00"), COALESCE(LFinal.LastFight,"1999-01-01 00:00:00")) as Last_Fight, 
   
IF(COALESCE(WFinal.LastFight,"1999-01-01 00:00:00") > COALESCE(LFinal.LastFight,"1999-01-01 00:00:00"),
   WFinal.Current_Streak,LFinal.Current_Streak) as Current_Streak,
   
IF(
  IF(
    COALESCE(WFinal.LastFight,"1999-01-01 00:00:00") > 
    COALESCE(LFinal.LastFight,"1999-01-01 00:00:00"), 
    WFinal.Current_Streak,LFinal.Current_Streak) = 15 and 
  MasterList.Tier != 'X',"Promoted", 
  IF(
    IF(
      COALESCE(WFinal.LastFight,"1999-01-01 00:00:00") > 
      COALESCE(LFinal.LastFight,"1999-01-01 00:00:00"), 
      WFinal.Current_Streak,LFinal.Current_Streak) = -15 and 
    MasterList.Tier != 'X',"Demoted","")) as "Promote/Demote"

from MasterList
left join LFinal on
MasterList.id = LFinal.Fighter and
MasterList.Tier = LFinal.Tier
left join WFinal on
MasterList.id = WFinal.Fighter and
MasterList.Tier = WFinal.Tier
where MasterList.Name in (?,?)
order by rate desc;