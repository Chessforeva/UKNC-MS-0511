UKNC javascript emulator HTML5
(version v2.0)

Some games and demos.

Note: put the "keybimgs" folder in the root, or modify path in Touches.js


Derived from UKNCBTL. There is no other good source.

For floppy images use the rt11dsk.exe utility.
HDD IDE .img images, or simply let the sample grow, and save later.



Sounds additions from 03.2026.
Samples and newest games updates too.
Hard disks boths slots - verified ok.

LBA28 for fast HDD, the BadApple covox demo, addition 04.2026 


Blog: https://bezjega.blogspot.com/2021/03/uknc-emulator-online.html



Online:
https://chessforeva.neocities.org/UKNC/uknc.htm

https://chessforeva.bitbucket.io/UKNC/uknc.htm


Notes:

The emulator skips interrupts, ignores much of proper timings, differs from the real hardware.
It is javascript running full speed. Anyway, looks fine.

Intended for ESP sounds, FPGAs tomorrow and UKNC murmulators with a GB RAM (it's a joke :)

Turbomode enabler:)
Just like in BK-0010 case, the timer.start too low makes often interrupts,
stealing time for the emulator to redraw screens, catch keyboard, read disks, etc.
Gemini made a crash sample:
MOV #1,   @#177712    ; Set 'start' to 1 (extremely fast)
MOV #1,   @#177714    ; Set Current to 1 (Trigger immediately)
MOV #203, @#177710    ; Start, 1:16 Divisor, Auto-Reload, Interrupt Enable



Good sources of software on the Web:

1. Collections of floppy .dsk images.
https://hobot.pdp-11.ru/ukdwk_archive/



2. An 170Mb .img Hard disk image file of software available for downloading at site.
Download 47Mb rar-file and drop it onto the emulator, restart F12.
Set 2 - boot from cartridge, it is slot 1
Then enter 0 as slot number (0-5)
That's it.
Works locally in browser and fast.
Nothing is uploaded to the server on a file-drop onto the emulator.

https://hobot.pdp-11.ru/EMULATORS/UKNCBTL_HDD/uknc_hdd_id/


3. The Bad Apple Covox emulation
https://github.com/blairecas/badapple/tree/main
Download the bappwd.img (54 Mb) file and drop onto the emulator, restart F12.
So, Boot HDD from cartridge.
Covox, 2t  - optimal smooth sounds.
Note:
  If it runs too fast then adjust the speed options.
  It is LBA28 fast HDD for standard WD ROM. For this demo it finds by default.



4. Other:

https://hobot.pdp-11.ru/ukdwk_archive/ukncbtlwebcomplekt/best_GAMES_UKNC/bestgamesUKNC.dsk

https://hobot.pdp-11.ru/ukdwk_archive/ukncbtlwebcomplekt/ASPcorpGAMES_UKNC/ASPcorpGAMES_UKNC.dsk

