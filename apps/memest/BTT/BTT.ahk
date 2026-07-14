;#Include UserSelect.ahk
#Include CardPicker.ahk

; user Input count (맞았을 때만 count함)
gMaxSpeed = 0
gInputCount = 0
gTempInputCount = 0
gMaxSpeed = 0
gCurrentSpeed = 0
gStartInputTime  = 0
gEndInputTime = 0
g_praticeModeName := "암송모드"

if (i_practiceMode != "Typing")
{
	g_praticeModeName := "암송모드로.."
} Else {
	g_praticeModeName := "타자연습모드로.."
}
;------------------------------------
StartBTT:
;------------------------------------

LoadAllCards(BTTUser)
Gui, Add, GroupBox, x202 y22 w470 h160 ,

if (i_practiceMode != "Typing")
{
Gui, Font, S24 CDefault Bold, Verdana
Gui, Add, Text, x252 y42 w350 h50 vTextVerse +Center,
}

Gui, Font, S20 CDefault norm, 궁서
Gui, Add, Edit, x22 y192 w800 h250 vEditContents
Gui, Add, ComboBox, x132 y-80 w180 h122 , ComboBox
Gui, Add, DropDownList, x172 y-78 w50 h120 , DropDownList

Gui, Font, S10 CDefault, Verdana
Gui, Add, GroupBox, x22 y22 w170 h60 , 암송BOX
Gui, Font, S12 CDefault Bold, Verdana
Gui, Add, Text, x50 y47 w130 h20 vTextCardBox, %cardBoxNameAndCnt1%(%cardBoxNameAndCnt2%)
Gui, Font, S10 CDefault, Verdana
Gui, Add, Text, x50 y5 w800 h15 , Enter: 다음 카드,  Shift+Enter: 이전 카드,  F1: Hint, F4: 진행방향전환,  F7: 12구절뒤,  F8: 12구절앞

; Check Box Loop
;KIH: yLocation = 42
;KIH: Loop, parse, cardBoxList, `,
;KIH: {
;KIH: ;KIH: 	MsgBox % A_LoopField
;KIH:     if A_LoopField =  ; ,로 인해 생기는 맨 마지막 blank item 무시하기 위해.
;KIH:         continue
;KIH: 	Gui, Add, CheckBox, x52 y%yLocation% w130 h20 Checked vCb%A_LoopField%, %A_LoopField%
;KIH: 	yLocation += 30
;KIH: }


Gui, Font, S10 CDefault, Verdana
Gui, Add, GroupBox, x22 y130 w170 h52 , 입력속도
Gui, Font, S12 CDefault Bold, Verdana
Gui, Add, Text, x50 y152 w130 h20 vTextInputSpeed, %gMaxSpeed%(%gCurrentSpeed%)
;KIH: Gui, Add, CheckBox, x52 y42 w130 h20 Checked vCbCard60, 5_8_60구절
;KIH: Gui, Add, CheckBox, x52 y72 w130 h20 vCbCard180, 180구절
;KIH: Gui, Add, CheckBox, x52 y102 w130 h20 vCbCardDEP, DEP
;KIH: Gui, Add, CheckBox, x52 y132 w130 h30 vCbCardOPY, OYO

Gui, Add, Progress, x32 y522 w650 h20 vProgressReview, 0
if (i_practiceMode != "Typing")
{
Gui, Font, S20 CDefault cBlue, 궁서
Gui, Add, Edit, x212 y102 w440 h70 +Center vEditTitle,
} Else {
Gui, Font, S10 CDefault Bold, Verdana
Gui, Add, Text, x210 y35 w450 h140 vTextForTyping,
}

Gui, Font, S13 CDefault Bold, Verdana
Gui, Add, Button, x25 y92 w165 h35 gBttConfig vButtonConfig, %g_praticeModeName%
Gui, Font, S20 CDefault cBlue, 궁서
Gui, Add, Button, x682 y32 w140 h140 gTheEnd vButtonEnd, 종료
Gui, Font, S12 CDefault, Verdana
Gui, Add, Text, x702 y522 w120 h20 +Center vTextProgress, 0`% (0/%i_totalReviewCount%)
; Generated using SmartGUI Creator 4.0
Gui, Font, S12 CDefault norm, 궁서
Gui, Add, Text, x22 y450 w800 h30 +Center vTextCategory
Gui, Font, S14 CDefault Bold, 굴림
Gui, Add, Text, x22 y490 w800 h30 vTextStatus

Gosub NextCard
Gui, Show, Center h559 w843, %BTTUser%(%g_processingDirection%)

; 한영키로 한글로 바꿔보고,
if !IMECheck(WinActive())
{
    Send, {VK15}	; 한영키 전송.
}

; 바뀌지 않았으면 다시 한번 Shift+Space로 바꿔본다.
if !IMECheck(WinActive())
{
    Send, +{Space}
}

;Send, +{Space}
Return ;=============================

;------------------------------------
ShowTitle:	; 제목 보여주고, 장절 지우기
;------------------------------------
GuiControl,, EditTitle, %cardTitle%
if (i_practiceMode != "Typing")
{
	GuiControl,, TextVerse, 
}
Return ;=============================

;------------------------------------
NextCard:	; 다음 카드 1장 뽑아 표시
;------------------------------------
cardVar := PickOneCard(cardVerse, cardTitle, cardContents, cardCategory)
; card 내용에 중 제목과 소제목도 함께 넣음.
StringSplit, cardBoxNameAndCnt, s_currentCardBox, _
if cardBoxNameAndCnt1 != cardOYO 
{
	gCardCateogryStartLen := StrLen(cardTitle) + (StrLen(cardVerse)*2) + StrLen(cardContents) + 3 ; + 3은 엔터 3번
	gCardTitleLen := StrLen(cardTitle)
	gCardContentStartLen := StrLen(cardTitle) + StrLen(cardVerse)
	gCardContentEndLen := StrLen(cardTitle) + StrLen(cardVerse) + StrLen(cardContents) + 2
	cardContents = 
	(
%cardTitle%
%cardVerse%
%cardContents%
%cardVerse%
%cardCategory%
	)
} Else {
	gCardCateogryStartLen = 0
	gCardTitleLen = 0
	cardContents = 
	(
%cardVerse%
%cardContents%
%cardVerse%
	)
}
wrongCount = 0
gMatchedLen = 0
gCardContentsLen := StrLen(cardContents)

i_nowReviewdCount := i_currentCardIndex - i_startCardIndex
nowPorgressPercentage := Round(i_nowReviewdCount/i_totalReviewCount * 100)
GuiControl,, TextProgress, %nowPorgressPercentage%`% (%i_nowReviewdCount%/%i_totalReviewCount%)
GuiControl,, ProgressReview, %nowPorgressPercentage%
if (i_practiceMode != "Typing")
{
	GuiControl,, TextVerse, %cardVerse%
	g_praticeModeName := "암송모드로.."
} Else {
	GuiControl,, TextForTyping, %cardContents%
	g_praticeModeName := "타자연습모드로.."
}
GuiControl,, TextCategory, | %cardCategory% |

cardBoxRealName = % %cardBoxNameAndCnt1%
GuiControl,, TextCardBox, %cardBoxRealName%(%cardBoxNameAndCnt2%)
GuiControl,, EditContents	; EditContents 내용 지우기
GuiControl,, EditTitle	; EditTitle 도 일단 지운다. 
GuiControl,, TextStatus
SetTimer, ShowTitle, -5000	; 5초후에 1번만 ShowTitle을 실행하라. (-는 1번만 하라는 뜻임)
Return ;=============================

;####################################
#IfWinActive ahk_class AutoHotkeyGUI
;####################################
\::BackSpace
;------------------------------------
Enter::		; 다음 카드.
;------------------------------------
gStartInputTime = 0
gInputCount = 0
gTempInputCount = 0
ChangeEditContentColor("cBlack")	; 본문의 글자색을 다시 검정생으로 돌려 놓는다.
GuiControl,, EditContents	; EditContents 내용 지우기
gMatchedLen = 0
Gosub NextCard
Send, {BackSpace}
typedLen = 0
Return ;=============================

;------------------------------------
+Enter::	; 이전 카드.
;------------------------------------
if (g_processingDirection = "Forward")
{
	g_processingDirection := "Backward"
} Else {
	g_processingDirection := "Forward"
}
Gosub Enter
if (g_processingDirection = "Forward")
{
	g_processingDirection := "Backward"
} Else {
	g_processingDirection := "Forward"
}
Return ;=============================

;------------------------------------
^+Backspace::	; 이전 12카드.
F7::
;------------------------------------
i_currentCardIndex -= 13
Goto Enter
Return ;=============================

;------------------------------------
^Backspace::	; 이후 12카드.
F8::
;------------------------------------
i_currentCardIndex += 11
Goto Enter
Return ;=============================

;------------------------------------
; 문자 입력 처리.
a::
b::
c::
d::
e::
f::
g::
h::
i::
j::
k::
l::
m::
n::
o::
p::
q::
r::
s::
t::
u::
v::
w::
x::
y::
z::
1::
2::
3::
4::
5::
6::
7::
8::
9::
0::
,::
.::
/::
`;::
'::
[::
]::
-::
=::
+a::
+b::
+c::
+d::
+e::
+f::
+g::
+h::
+i::
+j::
+k::
+l::
+m::
+n::
+o::
+p::
+q::
+r::
+s::
+t::
+u::
+v::
+w::
+x::
+y::
+z::
+1::
+2::
+3::
+4::
+5::
+6::
+7::
+8::
+9::
+0::
+,::
+.::
+/::
+`;::
+'::
+[::
+]::
+\::
+-::
+=::
;------------------------------------
; TODO. 세벌식의 경우 자동 입력 기호들을 바꾸어 줘야 함. (cardContents변수 값을 짤라서 EditContents에 넣을 수도 있음)


processUserInput()

Return ;=============================

;------------------------------------
RecoverString:	; 매치된 String까지만 남기고, 나머지 다 지움.
;------------------------------------
recoverStr := SubStr(cardContents, 1, gMatchedLen)
GuiControl,, EditContents, %recoverStr%
Return ;=============================

;------------------------------------
BackSpace::	; 글자 지우면서, gMatchedLen도 함게 뒤로 미룸.
;------------------------------------
gTempInputCount = 0
gInputCount--
Send, {BackSpace}
GuiControlGet, editString,, EditContents
typedLen := StrLen(editString)
;ToolTip % " typedLen=" . typedLen . " gMatchedLen=" . gMatchedLen
if (gMatchedLen > typedLen)
	gMatchedLen := typedLen

Return ;=============================

;------------------------------------
Space::	; 그 다음 Space 나 기호 자동 입력
;------------------------------------
GuiControlGet, editString,, EditContents
typedLen := StrLen(editString)
if (typedLen = gMatchedLen)
{
	; 글자 사이의 공백이나 기호는 자동으로 입력해주는 처리.
	gMatchedLen += BetweenCharProcess(cardContents, gMatchedLen)
	gMatchedLen += BetweenCharProcess(cardContents, gMatchedLen)
}

Return ;=============================
;------------------------------------
^Space::	; 그 다음 글자 자동입력기능.
`::
F1::
;------------------------------------
gRetryFlag := True
GuiControlGet, editString,, EditContents
typedLen := StrLen(editString)
if (typedLen = gMatchedLen)
{
	; 글자 사이의 공백이나 기호는 자동으로 입력해주는 처리.
	Loop
	{
		tempSkipLen := BetweenCharProcess(cardContents, gMatchedLen)
		gMatchedLen += tempSkipLen
		if (gCardContentsLen <= gMatchedLen)
			Break
		if tempSkipLen = 0
			Break
	}

	; 틀린 것으로 간주함.
	wrongCount++
	; 추가로 입력해줄 1글자 더하기
	autoInputLen = 2
	gMatchedLen += autoInputLen
	autoInputStr := SubStr(cardContents, 1, gMatchedLen)	; 처음부터 추가 1글자까지 가져오기
;KIH: 	GuiControl,, TextStatus, %autoInputLen%|%gMatchedLen%|%autoInputStr%	; 상태표시
	GuiControl,, EditContents, %autoInputStr%	; 입력창에 세팅.
	Send, ^{End}
	;KIH: 	MsgBox % "typedLen=" . typedLen . "autoInputLen=" . autoInputLen . "autoInputStr=" . autoInputStr
	;gMatchedLen += BetweenCharProcess(cardContents, gMatchedLen)
	;gMatchedLen += autoInputLen	; gMatchedLen 갱신.
}

Return ;=============================


;------------------------------------
F4::	; Drection Change
	if (g_processingDirection = "Forward")
	{
		g_processingDirection := "Backward"
	} Else {
		g_processingDirection := "Forward"
	}
	Gui, Show, Center h559 w843, %BTTUser%(%g_processingDirection%)
Return
;------------------------------------
F5::	; Reload
;------------------------------------
Tab::	; 화면을 없애고 사용자를 바꿔서 BTT 화면을 새롭게 띄움.
;------------------------------------
IniWrite, %i_currentCardIndex%, data\%BTTUser%.ini, Starting, currentCardIndex
IniWrite, %BTTUser%, Btt.ini, Common, nowUser

Gui, Destroy
Sleep, 100
if (A_ThisHotkey = "F5")
{
	InitGlobal("")
} Else {
	InitGlobal(BTTUser)
}

Gosub StartBTT
Return

;------------------------------------
BttConfig:
;------------------------------------
	if (i_practiceMode != "Typing")
	{
		i_practiceMode := "Typing"
	} Else {
		i_practiceMode := "Memory"
	}

	Gui, Destroy
	Sleep, 100
;	InitGlobal(BTTUser)
	Gosub StartBTT
Return

;------------------------------------
TheEnd:
GuiClose:
;------------------------------------
IniWrite, %i_currentCardIndex%, data\%BTTUser%.ini, Starting, currentCardIndex
IniWrite, %i_practiceMode%, data\%BTTUser%.ini, Starting, practiceMode
IniWrite, %BTTUser%, Btt.ini, Common, nowUser

ExitApp ;=============================


;##############################################################################
; 함수 정의
;##############################################################################


;************************************
; 글자 사이의 공백이나 기호는 자동으로 입력해주는 처리.
processUserInput()
;************************************
{
	global
	local tempSkipLen

	Loop
	{
		tempSkipLen := BetweenCharProcess(cardContents, gMatchedLen)
		gMatchedLen += tempSkipLen
		if (gCardContentsLen <= gMatchedLen)
			Break
		if tempSkipLen = 0
			Break
	}
	
	Send, %A_ThisHotkey%

	GuiControlGet, editString,, EditContents
	typedLen := StrLen(editString)

	compVar := SubStr(editString, 1, typedLen)
	pos := InStr(cardContents, compVar)
	;	ToolTip % pos . " compVar=" . compVar . " newInputVar=]" . newInputVar . "["
;KIH: 	statusStr := "gCardContentsLen=" . gCardContentsLen . " typedLen=" . typedLen . " gMatchedLen=" . gMatchedLen . "pos=" . pos . " compVar=" . compVar . 
;KIH: 	GuiControl,, TextStatus, %statusStr%	; 상태표시

;	GuiControl,, TextStatus, gMatchedLen:%gMatchedLen% gInputCount:%gInputCount% ;gStartInputTime:%gStartInputTime%(gCardContentStartLen:%gCardContentStartLen%) gCardContentEndLen=%gCardContentEndLen% 	; for debug

	; 본문 입력 시작
	if (gCardContentStartLen < gMatchedLen and gStartInputTime = 0) {
		PrepareInputSpeedSetting()
	}


	gTempInputCount++
	if pos = 1	; 입력한 내용과 원문 내용이 같으면
	{
		gInputCount += gTempInputCount
		gTempInputCount = 0
		Send, {Right}	; 그 다음 초성을 입력받도록 오른 쪽 방향키로 글자 완성 모드에서 나감.

		; gMatchedLen을 갱신한다.
		gMatchedLen := typedLen

		ToolTip ; 툴팁 지우기

		; 글자 사이의 공백이나 기호는 자동으로 입력해주는 처리.
		Loop
		{
			tempSkipLen := BetweenCharProcess(cardContents, gMatchedLen)
			gMatchedLen += tempSkipLen
			if (gCardContentsLen <= gMatchedLen)
				Break
			if tempSkipLen = 0
				Break
		}


		; 본문 입력 끝
		if (gCardContentEndLen <= gMatchedLen and gEndInputTime = 0) {
			; 분당 입력속도 세팅
			SetInputSpeed(gInputCount)
		}

		; 카드의 타이핑이 끝났으면,
		if (gCardContentsLen <= gMatchedLen) {
			if gRetryFlag {

				if (g_processingDirection = "Forward")
				{
					i_currentCardIndex--
				} Else {
					i_currentCardIndex++
				}
				finishMent = 자 ~ 다시 한 번..
			} Else if (wrongCount || gPrevRetryFlag) {
				finishMent = 아멘.                      (%wrongCount%)
			} Else {
				finishMent = 와우! 퍼팩트~!
			}
;KIH: 			Gosub NextCard


			ChangeEditContentColor("cBlue")	; 본문 글자색을 파란색으로 바꿔준다.
			GuiControl,, TextStatus, %finishMent%
		}
	}
	Else ; 입력한 내용과 원문 내용이 틀렸을 때,
	{
		if (typedLen > gMatchedLen + 2) {
			gTempInputCount = 0
			wrongCount++
		}

		; 그 틀린 차이가 한글로 3자 이상 나면 툴팁 표시.
		if (typedLen > gMatchedLen + 4) {
			SoundPlay, *-1	; 간단한 알림 음를 재생함.
			nextExpectedString := SubStr(cardContents, gMatchedLen + 1, 8)
			ToolTip, %nextExpectedString%, 420, 270 	; X, Y = TTS화면 크기의 중간 값.
			gRetryFlag := True
		}
	}
}
;************************************
BetweenCharProcess(cardContents, nextCharPos)	; 글자 사이의 공백이나 기호는 자동으로 입력해주는 처리.
;************************************
{
	global gCardTitleLen, gCardCateogryStartLen, gInputCount
	; 자동으로 처리한게 있으면 1, 없으면 0을 반환.
	;------------------------------------
	nextOneChar := SubStr(cardContents, nextCharPos + 1, 1)
;	skipStr := " ,.-*@"

;	GuiControl,, TextStatus, %nextCharPos% (%gCardCateogryStartLen%) inputCount=%gInputCount% 	; for debug
	if (gCardTitleLen >= nextCharPos or gCardCateogryStartLen < nextCharPos) {
; Category와 제목 입력할 때라면, 아래 문자들 Skip함.
		skipStr := "abcdefghijklmnopqrstuvwxyz1234567890 ,!""`#$`%&'()*+'-./:`;<=>?@[`\]^_{|}~`n"
	} else {
		skipStr := "SI ,!""`#$`%&'()*+'-./:`;<=>?@[`\]^_{|}~`n"
	}
	

	; 입력하는 위치에 건너 뛸 글자가 있으면, 자동으로 삽입해줌.
	if (InStr(skipStr, nextOneChar) > 0)
	{
		; 추가로 입력해줄 1글자 더하기
		autoInputStr := SubStr(cardContents, 1, nextCharPos + 1)	; 처음부터 추가 1글자까지 가져오기
;KIH: 		GuiControl,, TextStatus, %autoInputLen%|%gMatchedLen%|%autoInputStr%	; 상태표시
		GuiControl,, EditContents, %autoInputStr%	; 입력창에 세팅.
		Send, ^{End}

		Return 1
	}
	Return 0
}

;************************************
IMECheck(hWnd = "")	; 한영 체크함수 : 한글상태면 1, 영문이면 0 을 Return
; HWND : 윈도우핸들 - 윈도우라는 OS에서 화면 출력을 위해 관리하는 리소스
;************************************
{
    IfEqual, hWnd,, WinGet, hWnd, ID, A
    DefaultIMEWnd := DllCall("imm32\ImmGetDefaultIMEWnd", "UInt", hWnd)
    DetectSaved = %A_DetectHiddenWindows%
    DetectHiddenWindows, On
    SendMessage, 0x283, 5, 0,, ahk_id %DefaultIMEWnd%
    IfNotEqual, A_DetectHiddenWindows, %DetectSaved%, DetectHiddenWindows, %DetectSaved%
    Return, ErrorLevel
}

;************************************
ChangeEditContentColor(color)
;************************************
{
	; 폰트를 다시 검정생으로 돌려놓기.
	Gui, Font, Norm S20 CDefault %color%, 궁서	; 이렇게 값을 바꿔놓고,
	GuiControl, Font, EditContents	; 이렇게 하면 적용이 된다.
}

;************************************
SetInputSpeed(inputCount)
;************************************
{
	global 
	local spentInputTime
	gEndInputTime := A_TickCount
	spentInputTime := (gEndInputTime - gStartInputTime) / 1000
	gCurrentSpeed := Round(inputCount / (spentInputTime / 60))

	if (gMaxSpeed < gCurrentSpeed)
	{
		gMaxSpeed := gCurrentSpeed
	}

	GuiControl,, TextInputSpeed,(mx:%gMaxSpeed%) %gCurrentSpeed%

	GuiControl,, TextStatus, inputCount:%inputCount% spentInputTime:%spentInputTime%
}

;************************************
PrepareInputSpeedSetting()
;************************************
{
	global 
	gEndInputTime = 0
	gStartInputTime := A_TickCount
	gInputCount = 0
}
