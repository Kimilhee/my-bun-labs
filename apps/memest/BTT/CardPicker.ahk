; 현재 사용자 가져오기; 현재 사용자가 없으면, bttUserList의 첫번째 사용자를 세팅한다.
IniRead, temp_nowUser, Btt.ini, Common, nowUser
; bttUserList1 ~ XX에 사용자 이름을 만들어 놓는다.
Loop, data\*.ini
{
	StringTrimRight, userName, A_LoopFileName, 4	; .ini 확장자 없애기.
	bttUserList%A_Index% := userName
	%userName% := A_Index	; 이름 변수에 index도 저장.
	bttUserCount := A_Index	; 맨 마지막 세팅된 index가 사용자 수.
	if (userName == temp_nowUser)
	{
		s_nowUser := userName
	}
}

if !(s_nowUser)
	s_nowUser := bttUserList1

InitGlobal("")
;KIH: LoadAllCards(BTTUser)
;KIH: PickOneCard(a, b, c, e)
;KIH: MsgBox % a
;************************************
InitGlobal(newUser) {
;************************************
	global
	g_processingDirection := "Forward"
	card005 = 5확신
	card008 = 8구절
	card060 = 60구절
	card180 = Series
	cardDEP = DEP
	cardOYO = OYO

	; User Change할 때 필요함.
	if !(newUser = "")
	{
		nextIndex = % %newUser%
		nextIndex := mod(nextIndex+1, bttUserCount+1)
		if (nextIndex == 0)
			nextIndex = 1

		s_nowUser := bttUserList%nextIndex%
	}



	; 암송 복습방식; 초기값이 없으면, 순차
	IniRead, i_cardCheckingType, data\%s_nowUser%.ini, Starting, cardCheckingType, Sequencial	; Sequencial/Random
	IniRead, i_practiceMode, data\%s_nowUser%.ini, Starting, practiceMode, Memory	; Typing/Memory

	; 현재 암송 복습진도; 초기값이 없으면, 60구절 처음을 세팅.
	IniRead, i_currentCardIndex, data\%s_nowUser%.ini, Starting, currentCardIndex, 1
	i_startCardIndex := i_currentCardIndex
	i_currentCardIndex--	; nextCard에서 ++한 후 카드가져오기 때문에, 다시 빼줌.
	; 복습구절수
	IniRead, i_reviewOldCount, data\%s_nowUser%.ini, Starting, reviewOldCount, 12	; Old 복습구절 수
	IniRead, i_reviewRecentCount, data\%s_nowUser%.ini, Starting, reviewRecentCount, 12	; 최근 복습구절수
	IniRead, i_reviewNewCount, data\%s_nowUser%.ini, Starting, reviewNewCount, 2	; New 구절수

	IniRead, s_cardOrder, data\%s_nowUser%.ini, Starting, cardOrder ; 005, 008, 060, 180, DEP
	IniRead, i_card005Progress, data\%s_nowUser%.ini, Starting, card005Progress, 1	; 5확신 진도 구절수
	IniRead, i_card008Progress, data\%s_nowUser%.ini, Starting, card008Progress, 0	; 8구절 진도 구절수
	IniRead, i_card060Progress, data\%s_nowUser%.ini, Starting, card060Progress, 0	; 60구절 진도 구절수
	IniRead, i_card180Progress, data\%s_nowUser%.ini, Starting, card180Progress, 0	; 180 진도 구절수
	IniRead, i_cardDEPProgress, data\%s_nowUser%.ini, Starting, cardDEPProgress, 0	; DEP 진도 구절수
	IniRead, i_cardOYOProgress, data\%s_nowUser%.ini, Starting, cardOYOProgress, 0	; OYO 진도 구절수

	i_totalReviewCount := i_reviewRecentCount + i_reviewNewCount
	i_totalReviewCount := i_reviewOldCount
	i_nowReviewdCount = 0
	s_currentCardBox = 

	allCardIndex = 1
	BTTUser := s_nowUser
	totalCardLen = 0
	cardBoxList =
}

;************************************
LoadAllCards(BTTUser) {
;************************************
	global

	; 5, 8, 60, 180, DEP load
;KIH: 	Loop, data\*.txt
	Loop, parse, s_cardOrder, `,
	{
		cardBoxName = %A_LoopField%	; for AutoTrim
		cardBoxName = card%cardBoxName%	; 
		cardFileName = data\%cardBoxName%.txt
		cardBoxList = %cardBoxList%%cardBoxName%`,	; , 로 파일 박스 이름을 구분함.
		cardProgress := i_%cardBoxName%Progress
		%cardBoxName%_Len := LoadCards(cardFileName, cardBoxName, cardProgress)
		totalCardLen += %cardBoxName%_Len
	;KIH: 	MsgBox % %cardBoxName%_Len . " : " . totalCardLen
	}

	; OYO load
	Loop, data\%BTTUser%\*.txt
	{
		StringTrimRight, cardBoxName, A_LoopFileName, 4 ; .txt 확장자 없애기.
		cardBoxList = %cardBoxList%%cardBoxName%`,	; , 로 파일 박스 이름을 구분함.
		%cardBoxName%_Len := LoadCards(A_LoopFileFullPath, cardBoxName)
		totalCardLen += %cardBoxName%_Len
	}
}

;KIH: Loop, parse, cardBoxList, `,
;KIH: {
;KIH:     if A_LoopField =  ; 맨 마지막 ,로 인해 생기는 blank item 무시하기 위해 체크.
;KIH:         continue
;KIH: 	MsgBox % A_LoopField 
;KIH: }

;MsgBox % "Card60_Len=" . card60_Len

;************************************
; card를 파일에서 읽어서 cardXX 라는 변수들에 넣어둔다.
LoadCards(cardFile, cardBoxName, cardProgress = 9999999) {
;************************************
	global	; Card060_X 등이 외부에서도 사용되어 지도록 하기 위함.
;KIH: 	MsgBox % cardFile
	local cardLen, tempStr
	Loop, read, %cardFile%
	{
		; 진도 만큼만 처리하고 빠져나감.
		if (A_Index > cardProgress)
			Break

		StringReplace, oneLine, A_LoopReadLine, @&, %A_SPACE%%A_SPACE% , ALL
		setCardTemp := oneLine

		; DEP나 OYO는 field3과 field4가 모두 Contents이기 때문에, field3과 field4 사이의 TAB을 제거한다.
		if (cardBoxName = "cardDEP" || cardBoxName = "cardOYO")
		{
			setCardTemp =	; Null String세팅.
			Loop, parse, oneLine, %A_Tab%
			{
				; 3번째 field뒤에는 TAB을 붙이지 않으므로 field3과 field4를 붙이는 효과를 냄.
				if (A_Index = 3)
				{
					tempStr = %A_LoopField%		; autotrim을 활용하여 TAB제거
					setCardTemp := setCardTemp . tempStr . " "
				}
				Else
					setCardTemp := setCardTemp . A_LoopField . A_Tab	; 여기는 =를 쓰면 안됨. =는 autotrim 됨 
			}
		}

		%cardBoxName%_%A_Index% := setCardTemp
		allCardList%allCardIndex% = %cardBoxName%_%A_Index%
		allCardIndex++

		; 카드수를 세팅.
		cardLen := A_Index
	}
	Return cardLen
}

;************************************
; 카드한장을 뽑아낸다.
PickOneCard(ByRef verse, ByRef title, ByRef contents, ByRef category) {
;************************************
	local aCardContent, cardIndex, aCard
	; function 첫행이 local 변수선언이면 나머지는 자동으로 전역변수가 된다.

;KIH: 	if i_cardCheckingType = Sequencial
		aCard := GetACard()
;KIH: 	Else
;KIH: 		aCard := LotACard()
	s_currentCardBox := aCard	; 

	aCardContent = % %aCard%	; 변수 내용을 변수명으로 한 변수의 값 세팅.

	Clipboard := aCardContent	; 카드 내용을 clipboard에 넣어둔다.

	Loop, parse, aCardContent, %A_Tab%
	{
		field_%A_Index% := A_LoopField
	}

	; 이하 할당들은 AutoTrim 됨.
	verse = %field_1%
	title = %field_2%
	contents = %field_3%
	category = %field_4%

	gPrevRetryFlag := gRetryFlag
	gRetryFlag := False	; 반복 flag는 처음에는 False로 해 둔다.
	Return aCard
}

;************************************
GetACard() {	; 다음 뽑을 카드를 순차적으로 가져오는 함수.
;************************************
	local nextCard

	if (g_processingDirection = "Forward")
	{
		i_currentCardIndex++
	} Else {
		i_currentCardIndex--
	}

	; 카드 마지막까지 왔으면 다시 처음부터 시작하도록함.
	if (i_currentCardIndex > totalCardLen)
		i_currentCardIndex = 1
	if (i_currentCardIndex <= 0)
		i_currentCardIndex := totalCardLen

;KIH: 	MsgBox % i_currentCardIndex
	nextCard := allCardList%i_currentCardIndex%
	Return nextCard
}

;************************************
LotACard() {	; 다음 뽑을 카드를 랜덤하게 가져오는 함수.
;************************************
	local aCard, cardIdx, tempTotalLen = 0, thisCardLen = 0

	Random, randIdx, 1, %totalCardLen%	; min 1 ~ max totalCardLen 까지의 수 중 하나 뽑기.

	Loop, parse, cardBoxList, `,
	{
		;KIH: 	MsgBox % A_LoopField
		thisCardLen := %A_LoopField%_Len
		if (randIdx <= tempTotalLen + thisCardLen )
		{
			cardIdx := randIdx - tempTotalLen + 1
			aCard = %A_LoopField%_%cardIdx%
			Return aCard
		}
		tempTotalLen += %A_LoopField%_Len
	}
}
