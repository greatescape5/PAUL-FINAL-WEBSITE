-- 0020_program_nature_covers.sql
-- Swap the program/coaching card cover images over to the nature/outdoor set.
-- Programs (one-off) get the six new landscape shots; Coaching (recurring)
-- moves to the existing outdoor photos (hiking / snow / sailing).

update programs set cover_image = '/photos/kicking-horse.jpg'     where slug = 'starter-gym';
update programs set cover_image = '/photos/canoe-beach.jpg'       where slug = 'starter-home';
update programs set cover_image = '/photos/salmon-river.jpg'      where slug = 'kickstart-gym';
update programs set cover_image = '/photos/waterfall.jpg'         where slug = 'kickstart-home';
update programs set cover_image = '/photos/cannon-park.jpg'       where slug = 'transformation-gym';
update programs set cover_image = '/photos/lunch-peak-sunset.jpg' where slug = 'transformation-home';

update programs set cover_image = '/photos/hiking.png'           where slug = 'build';
update programs set cover_image = '/photos/snow.png'             where slug = 'accountability';
update programs set cover_image = '/photos/sailing.png'          where slug = '1-1-coaching';
