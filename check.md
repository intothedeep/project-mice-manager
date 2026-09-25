# 확인해야 할 것들

> 2026-09-23 기준 (커밋 `f47c865`). `x_temp.md`(gitignore된 개인 메모)의 내용을
> 옮겨 정리한 것 — 그 파일은 그대로 두었고, 이후로는 이 파일을 쓰면 됩니다.
>
> **세 종류가 섞여 있습니다.** A는 교수님만 답할 수 있는 것, B는 사람이 브라우저에서
> 직접 해봐야 하는 것, C는 이미 결정을 미루기로 한 것입니다. 섞어 읽지 마세요.

---

## A. 교수님께 여쭐 것

전문은 [`FLOWS.md`](./FLOWS.md) 맨 앞에 영어로 정리돼 있습니다. 여기는 요약입니다.

### A-1. 날짜 간격 — 전부 임시값인데 화면에 나오고 있습니다

| 일정 | 지금 쓰는 값 | 어디서 | |
|---|---|---|---|
| Plug check (교배 후) | **+10일** | Upcoming 화면에 표시됨 | ☐ |
| Plug check (교배 후) | **+5일** | 서버 SOP 체커 (`sopService.ts:74`) | ☐ |
| 출산 예정 (교배 후) | **+20일** | Upcoming | ☐ |
| 이유 (출생 후) | **+21일** | Upcoming | ☐ |
| 유전형 검사 (출생 후) | **+21일** | Upcoming | ☐ |
| 유전형 검사 최소 일령 | **21일** | 서버 SOP 체커 (`WEAN_AGE_DAYS`) | ☐ |

**Plug check 값이 두 개고 서로 다릅니다.** 둘 다 코드 주석에 "placeholder"라고
적혀 있습니다. 하나만 맞습니다.

**정정 (2026-09-23):** 제가 `+5` 를 "호출되지 않는 코드"라고 말씀드렸는데 틀렸습니다.
`sopService.ts:14` 가 임포트하고 `:74` 가 넘깁니다 — **살아있는 코드**입니다. 화면이
그 체커를 부르지 않아서 오늘은 둘이 안 마주칠 뿐입니다. 죽은 코드보다 나쁩니다.

확정되면 설정 테이블(`task_offset_rule`)로 옮겨서 프로그래머 없이 바꿀 수 있게
합니다 — 아직 안 만들어졌습니다.

### A-2. 유전형 표기

☐ `Nf1`은 두 카피를 다 보여줍니다 (`Nf1 f/+`). `PlpCre`와 `WT`는 안 보여줍니다.
  **마커에 따라 접합성을 쓰고 안 쓰고가 갈리는 게 맞습니까?**

☐ 트랜스진(`PlpCre`, `ccEGFP`)은 `Tg/+`(한 벌) · `Tg/Tg`(두 벌)로 기록합니다.
  **`Tg`가 랩에서 쓰는 토큰이 맞습니까?**

☐ `(hmo)`를 **동형접합에만** 붙입니까? 한 벌짜리는 그냥 `ccEGFP`로 두는 게 맞는지,
  아니면 `(het)`/`(hemi)` 같은 표기를 쓰시는지.

☐ 왼쪽이 모계, 오른쪽이 부계입니다 (`Nf1 f/+` = 어머니에게서 f). 맞습니까?

☐ **유전형 검사 결과가 어느 부모에게서 왔는지까지 알려줍니까?** 아니면 "헤테로"
  까지만 나옵니까?

  ⚠️ **이게 이 중에서 가장 파급이 큽니다.** "모른다"면 `f/+`와 `+/f` 중 하나를
  고르는 순간 **없는 정보를 지어내게** 됩니다. 트랜스진도 같습니다 — 헤미접합인 건
  아는데 `Tg/+`인지 `+/Tg`인지 모르는 상황이요.

  두 종류가 **같은 문제**라서, 트랜스진에만 전용 컬럼을 파는 걸로는 안 풀립니다.
  답이 "모른다"로 나오면 2026-09-17의 모계/부계 결정 자체를 다시 보되,
  좌위 유전자와 트랜스진을 **한꺼번에** 고쳐야 합니다.

☐ **`WT`를 두 축에 같이 쓰십니다** — 유전자 카탈로그의 마커이자, 야생형 개체군의
  리터 코드입니다. 지금 10마리가 **동시에 둘 다**입니다 (`M2WT`의 genotype이 `WT`).
  시스템은 다른 필드라 안 헷갈리지만, 사람은 라벨의 `WT`를 genotype으로 읽을 수
  있습니다. **의도하신 게 맞습니까?** 라벨에서 코드를 읽어내는 임포터를 나중에
  쓰면 여기서 섞입니다.

---

## B. 브라우저에서 직접 확인할 것

**아직 아무도 안 돌렸습니다.** 코드로는 검증했지만 사람 눈으로는 아직입니다.
`pnpm dev:web` → `http://localhost:3000`.

> 서버를 방금 띄웠는데 아무것도 안 눌리면, 기능 버그가 아니라 **hydration이 통째로
> 죽은 것**입니다. 콘솔에서 `_next/hmr` 줄을 보고 `next dev`를 재시작하세요.

### 펀치 (마킹)

```
☐ 1   그리드 열기
      → untagged·toe는 라벨에 글자 없음. 귀 펀치 1개면 e 하나

☐ 2   F10BEVe (201번) 드로어 열기
      → Punches에 untagged 행 + ear 행
      → untagged 행에는 Remove 버튼 없음, ear 행에는 있음

☐ 3   드로어의 펀치 추가 드롭다운
      → toe · ear · other 세 개만. untagged 없어야 함

☐ 4   ear 추가 → 저장
      → 드로어 헤더와 그리드 셀 둘 다 e 하나 증가

☐ 5   그 ear 제거
      → 라벨에서 e 하나 빠짐
      → 행은 취소선으로 남고 "removed" 표시

☐ 6   마지막 남은 펀치까지 Remove 시도
      → untagged는 못 지움. 0개가 될 수 없음

☐ 7   F11BEVee (204번) — 귀 펀치 2개짜리 (2026-09-23 추가)
      → 라벨에 e 두 개. 하나 지우면 e 하나로 줄어듦
```

### 쥐 추가 · 편집

```
☐ 8   [+] 레일로 쥐 추가 (4곳 전부: line·cage·slot·mouse)
      → 다이얼로그에 펀치 위치 선택 없음
      → 만들어진 쥐의 펀치는 untagged 하나, 날짜는 오늘

☐ 9   Add mouse 의 유전자 배지
      → PlpCre · Nf1 · Ai14 · ccEGFP · WT  (이 순서, 5개)
      → 아무것도 안 고르고 저장 가능 → genotype 이 '?'

☐ 10  Genes to check 태스크의 배지
      → 같은 목록에서 WT만 빠짐 (4개)

☐ 10b 드로어 → 연필 → 유전자마다 모계·부계 두 칸 (2026-09-23 추가)
      → 토큰 +  -  f  Tg  와 "기록 안 함"
      → 105번 ccEGFP 를 Tg/Tg 로  → 라벨이 ccEGFP(hmo)
      → Tg/+ 로 되돌리면        → ccEGFP
      → 한쪽만 지우면            → ccEGFP Tg/?
      → 둘 다 지우면            → ccEGFP (맨 코드)
      ★ 아무것도 안 건드리고 저장 → Nf1 f/+ 가 그대로 남아야 함

☐ 11  603번 드로어 → 연필 → sex를 F로 → Enter
      → 미리보기가 F5BFA. 아직 저장 전
☐ 12  저장 → 드로어·그리드 둘 다 F5BFA
☐ 13  연필 → M으로 → Cancel → F 유지

☐ 14  편집 중 Escape / 오버레이 클릭
      → 시트가 닫히고 draft 폐기 (정상 동작)

☐ 15  그리드 genotype·DOB 더블클릭
      → 아무 일도 안 일어남 (인라인 편집 제거됨, 의도된 것)
```

### 이동 · 부모 칸

```
☐ 16  쥐를 다른 케이지로 드래그 → 드로어
      → 펀치 행 그대로. ear 추가하면 라벨에 e 붙음

☐ 17  101번(M4BCW.2)에 유전자 추가
      → 101 자기 칸: 배경색 사라짐
      → 103번·202번 행의 아버지 칸: 색도 같이 사라져야 함
      ★ 여기서 옛날 청록색이 남아 있으면 2026-09-23 수정이 안 먹은 것

☐ 18  402번(F6AYL)은 202번의 어머니
      → 202번 어머니 칸이 F6AYL 로 나오는지 (F5AYL 아님)
```

### 오늘 추가된 쥐 (화면에서 눈으로)

```
☐ 19  104  F6BCW     Nf1 f/?            ← 한쪽만 기록된 경우
☐ 20  105  M7AZZ     ccEGFP
☐ 21  106  F8AZZ     ccEGFP(hmo)
☐ 22  302  M6BGX     PlpCre;Ai14 +/-    ← line 2 레일 색과 같은 색
☐ 23  104·105·106 은 배경색 없음 (색 키가 없어서 — 정상)

☐ 24  cage 2413 / C8 에서 M7AZZ(105) 와 F10AZZ(108) 나란히 보기
      → 둘 다 ccEGFP 로 똑같이 나옴
      → 105는 한 벌 확인됨, 108은 아직 안 봄
      ★ 교수님께 (het) 표기를 여쭐 때 이 두 줄을 보여드리세요

☐ 25  107  M9AZZ    ccEGFP Tg/?        ← 트랜스진 한쪽만 기록
☐ 26  303  F1BGY    PlpCre;Ai14 -/+    ← 302와 모계/부계가 정반대
      → 302(+/-) 와 303(-/+) 은 글자가 다르고 색도 다름
```

---

## C. 결정을 미뤄둔 것 (메모, 지금 답 안 해도 됨)

### C-1. 유전자 색상 모델 — `plan §5 Q47`

큰 틀은 정해졌습니다: 조립된 genotype 라벨 전체를 키로, 접합성이 다르면 다른 색,
순서는 `sort_key`로 정규화, `WT`와 `?`는 색 없음, 없는 조합은 색을 배정해서 저장.

미정 (급하지 않음):
- 배정 순서가 "처음 본 순서"에 달림 → 팔레트를 어디에 저장할지
- 13% 투명도에서 사람이 구분 가능한 색은 12~20개. 다 쓰면?
- 이건 "유전자마다 고유 색 + 접합성이 변조" 안과 **양자택일**입니다

### C-2. 유전자 조합 검증 — `plan §5 Q48`

한 쥐가 말이 안 되는 조합을 가질 수 있습니다:
- `[Nf1, WT]` — 돌연변이와 야생형 동시
- `[ccEGFP, ccEGFP(hmo)]` — 헤미접합과 동형접합 동시

`UNIQUE(mouse_id, gene_id)`는 gene_id가 달라서 안 막습니다.

사장님 스케치: *"mice_genes에 컬럼 하나 — hmo나 추가 표시용. jsonb? `|` 구분 문자열?"*

**해결됨 (2026-09-23).** `ccEGFP(hmo)` 카탈로그 행을 없애고, 접합성을 쥐의 행이
갖도록 P1 설계대로 정리했습니다 — 새 컬럼 없이 기존 모계·부계 두 칸이 `Tg/+`,
`Tg/Tg`를 담습니다. 남은 것은 `[Nf1, WT]` 사례 하나뿐입니다.

⚠️ 다만 **화면에서 구분이 안 되는 상태가 하나 생겼습니다**: 한 벌 확인된 트랜스진과
아직 안 본 트랜스진이 둘 다 `ccEGFP`로 나옵니다. 위 A-2의 `(het)` 질문이 이걸
가릅니다.

### C-3. Mate 케이스는 `mates` 행을 가리킨다 — 결정됨 2026-09-23

**문제:** Mate 케이스가 어미·아비 둘을 가리키는데 `CaseCard` 에는 쥐 FK 칸이
하나뿐이라, Mate 만 아직 `"F6AYL × M4BCW"` 를 **문자열로 저장**합니다. 이름이
바뀌면 틀어집니다 — 오늘 케이스 3에서 실제로 터진 그 결함입니다.

**제가 처음 제안한 건 "FK 두 개"였고, 그건 덜 좋은 답이었습니다.** `mates`
테이블을 안 보고 `CaseCard` 만 보고 말했기 때문입니다. 이미 있습니다:

```
mates.mother_mouse_id     → mouse_meta
mates.father_mouse_id     → mouse_meta
mates.occurred_at
mates.expected_delivery_on
```

**결정 (사장님): 케이스는 `mate id` 를 가리키고, 태스크가 거기서 쥐를 읽는다.**

```
Mate 케이스     subjectMateId   →  mates 행  →  어미·아비 양쪽 조립
plug check     subjectMouseId  →  어미만            ← 기존 칸, 새 필드 없음
출산 예정       subjectMouseId  →  어미만            ← 기존 칸, 새 필드 없음
```

**FK 두 개보다 나은 이유:**
- plug 확인과 출산은 **쌍이 아니라 어미의 일**입니다. 지금은 셋 다 쌍의 라벨을
  달고 있는데 뒤의 둘은 틀린 겁니다. 코드도 이미 알고 있습니다 —
  `getTasks.mock.api.ts:403` 의 `TODO real subject_mate_id→dam`
- `mates` 행이 교배일·출산예정일도 들고 있습니다. 지금 캐스케이드는 그 날짜를
  케이스에 **복사**하는데, 그것도 같은 결함입니다
- 교배 하나에 케이스가 여럿 붙어도 전부 한 행을 가리킵니다

**막는 것:** `mates` 행을 만드는 흐름이 아직 없습니다. Record Litter UI 와 같은
자리(DB 필요)라 E-5 와 함께 갑니다.

**정정 (2026-09-23): 제가 "cage·litter 는 FK 가 없어서 라벨 저장이 정당하다"고
말씀드린 건 틀렸습니다.** `CaseCard` 만 보고 `cases` 테이블을 안 봤습니다.
DB 에는 **전부 있습니다**:

```
subject_mouse_id → mouse_meta     subject_cage_id → cages
subject_mate_id  → mates          litter_id       → litters
subject_slot_id  → slots          subject_line_id → mouse_lines
                                  case_mice 조인 테이블 (묶음)
```

**`subject_mate_id` 도 이미 있습니다 — 마이그레이션이 필요 없습니다.**

진짜 그림: **DB 는 모든 주어를 제대로 모델링하는데, 클라이언트 DTO 가 FK 를 전부
버리고 문자열 하나로 대체했습니다.** 그래서 이 결함은 `mate` 만의 문제가 아니라
**`mouse` 를 뺀 전부**입니다. `9dda31d` 가 그중 하나를 고친 것입니다.

할 일은 스키마 변경이 아니라 **DTO 를 테이블에 맞추는 것**입니다.

### C-4. pup-ID 명세가 틀렸습니다 — 구현이 맞습니다

`p0.7.tasks.md` 의 pup-ID 생성기 항목이 *"bare unsexed form (`1BIZ`)"* — 성별
글자 없이라고 적고 있습니다. 실제 구현은 항상 성별을 붙입니다 (`U1BIZ`).

**사장님 확인: `U1BIZ` 가 맞습니다.** 명세 쪽을 고쳐야 합니다. 구현은 그대로.

### C-5. 이동 되돌리기 — 이력에서 한 번에 태스크 만들기

**결정된 규칙 (사장님, 2026-09-24): 완료된 이동은 취소하지 않습니다.** 쥐는 이미
옮겨졌고 기록은 그걸 반영해야 합니다. 되돌리려면 **원래 케이지로 가는 새 Move
태스크**를 만듭니다. 이미 그렇게 구현돼 있습니다 — 위치 로그는 추가만 되고
(삭제·되돌리기 경로 0건), 케이스 상태 전이도 앞으로만 갑니다.

오늘 하루 나온 규칙과 같은 계열입니다: `deleted_at` 툼스톤, 취소선으로 남는 펀치
제거. **일어난 일은 지우지 않고, 반대 방향의 사실을 하나 더 씁니다.**

**메모 — MVP2 (사장님: "for mvp2. not this point"). 지금은 만들지 않습니다.**
되돌리기가 새 태스크라면 그걸 만드는 게 쉬워야 합니다.
지금은 사람이 드로어의 이동 이력을 눈으로 읽고 → New task → Move → 쥐 고르고 →
이전 케이지를 손으로 다시 입력합니다.

**이동 이력이 이미 이전 케이지를 알고 있습니다.** 이력 행에서 바로 만들 수 있습니다:

```
이동 이력
  2026-09-24   2413/A8 → 2414/D8   Move case #4     [되돌리기 태스크]
                                                     ↑ 이전 케이지가 미리 채워진
                                                       Move 태스크 생성
```

한 번 누르면 될 일이고, 사람이 케이지 번호를 옮겨 적다 틀릴 여지도 없어집니다.
`MoveDialog` 에 `initialCageCode` prop 이 이미 있으니 새 메커니즘도 필요 없습니다.

**MVP1 에서 막히는 것은 없습니다** — 손으로 New task 를 만들면 됩니다. 이건 편의
기능이고, MVP1 의 일은 흐름이 맞는지 증명하는 것이지 클릭 수를 줄이는 게 아닙니다.

### C-6. 태스크 선택기가 죽은 쥐를 안 거름

`301 F5BGX` 는 `isAlive=false`, `signal='dead'` 인데 선택기에 나옵니다. 그래서
**이미 죽은 쥐에 Sac 이나 Genotyping 태스크를 만들 수 있습니다.**

`isLiveMouse` 함수는 있는데 슬롯 점유 수 계산에만 쓰이고 선택기는 안 막습니다.
`49a5330` 이전부터 그랬고, 그 커밋은 동작을 조용히 바꾸지 않으려고 그대로 뒀습니다.

정할 것은 **어느 태스크에서 빼느냐**입니다:
- 전부 제외
- `Sac` 만 제외하고 나머지는 허용 — 사후 조직 채취와 유전형 검사는 실제로 하니까

랩에서 죽은 쥐 조직으로 genotyping 을 하시는지에 달렸습니다.

### C-7. 태스크 다이얼로그의 쥐 라벨에 `.N` 이 없음 (해결됨)

그리드는 `M4BCW.2` 인데 다이얼로그는 `M4BCW` 입니다. 붙이려면 저장되는 subject
라벨까지 바뀌어서 단순 표시 변경이 아닙니다. 이것도 이전부터 그랬습니다.

### C-8. 그리드 내 부모 칸 — 절반만 이주됨 (해결됨)

~~글자는 조립되는데 색은 저장된 복사본~~ → 2026-09-23 해결. B-17로 눈 확인만 남음.

### C-9. `WT` 리터 예외

`WT`는 번식된 리터가 아니라 야생형 개체군의 상시 라벨입니다. 그래서:
- 생일이 같을 이유가 없음 (지금 9개 날짜, 정상)
- 부모·교배·출산예정일도 공유 안 함

나중에 "리터 코드가 같으면 생일도 같다" 검사를 넣으면 **`WT`는 반드시 예외**여야
합니다. 규칙은 `apps/colony_client_web/lib/litterCode.ts` 헤더에 적어뒀습니다.

---

## D. DB를 처음 만들기 전에

아직 데이터베이스가 없습니다. 만들기 전에:

```
☐ packages/db/scenarios/flow-weekly-cycle.sql 은 이미 고쳐둠 (2026-09-23)
☐ 마이그레이션 0001–0032 순서대로 적용
☐ packages/db/scripts/schema-doc.sh 실행 → SCHEMA.md 재생성
   (지금 SCHEMA.md 는 0027 시점 화석입니다)
```

---

## E. 남은 본 작업 6건 — 판정 (2026-09-23)

`docs/phases/p0.7.tasks.md` 에 남아 있는 여섯 개를 읽고 지금 착수 가능한지 본
결과입니다. **넷이 DB나 임포트된 스프레드시트에 걸려 있고, 둘 다 없습니다.**
잘못 계획된 게 아니라 **MVP2 작업이 MVP1 목록에 섞여 있는** 것입니다.

| | 작업 | 판정 | 막는 것 |
|---|---|---|---|
| 1 | 리터 코드 생성기 | **이미 거의 다 있음** | 아래 E-1 |
| 2 | pup-ID 생성기 | 명세가 틀림 | C-4 — 구현이 맞음 |
| 3 | 부모 파서 | 막힘 | 스프레드시트 없음 |
| 4 | `task_offset_rule` | 숫자 대기 | 교수님 답 (A-1) |
| 5 | Record Litter UI | 막힘 | DB 없음 |
| 6 | Breeders I–N | 막힘 | 스프레드시트 없음 |

전부 **지금은 두고**, 아래에 계획만 남깁니다.

### E-1. 리터 코드 생성기 — 사장님 제안에 대한 답

**제안:** 0–26 을 담는 컬럼 5개(글자당 하나) + 동시 수정을 막는 version 컬럼.

**이미 더 나은 게 들어 있습니다.** `0002_core_tables.sql:245`:

```sql
CREATE SEQUENCE litter_code_seq START 1612;
...
seq BIGINT NOT NULL DEFAULT nextval('litter_code_seq')   -- litters 테이블
```

확인한 숫자:

```
BIY = 1611          시트의 마지막 코드
START 1612 → BIZ    교수님이 "다음"이라고 적어두신 바로 그 값
그 다음      BJA BJB …
AZZ → BAA           롤오버 공짜 (bijective base-26)
ZZZ → AAAA          "
```

**version 컬럼이 필요 없는 이유:** version 은 낙관적 잠금입니다 — 충돌하면
다시 시도해야 합니다. 카운터에는 맞지 않는 도구입니다. `nextval()` 은 **원자적**
이고, 막지 않고, 두 사람에게 같은 값을 주지 않습니다. 재시도 루프가 없습니다.

**컬럼 5개가 필요 없는 이유 세 가지:**

1. **정렬은 이미 풀려 있습니다.** `seq` 자체가 순서입니다. 문자열로 정렬해야 할
   때도 `ORDER BY length(code), code COLLATE "C"` 면 맞습니다.
2. **5글자 상한이 생깁니다.** 지금 코덱은 `ZZZZZ` 를 넘어도 계속 자랍니다.
3. **같은 사실이 6군데 삽니다** (글자 5 + 문자열). 오늘 네 번 지운 그 모양입니다.

**그래서 남은 일은 생성기가 아니라 배선입니다** — `litters` 행을 만들 때
`seq` 를 받아 `formatLitterCode(seq)` 로 `litter_code` 를 채우는 것. 코덱
(`lib/litterCode.ts`)과 시퀀스 양쪽 다 이미 있습니다. **DB 가 생기면 그때.**

### E-5. Record Litter UI — 계획

"이 리터가 태어났다" 한 번으로 리터 + 새끼 N마리 + 미래 태스크 + 감사 로그가
**원자적으로** 생겨야 합니다. AC 가 *"any failure rolls back everything"* 이라
**트랜잭션이 필수**고, 트랜잭션은 DB 입니다. 목 스토어로는 이 AC 를 만족시킬 수
없습니다 — 흉내는 되지만 증명이 안 됩니다.

순서상 **E-1(배선) → E-5** 이고, 둘 다 D 섹션(첫 `createdb`) 뒤입니다.

### E-4. `task_offset_rule` — 계획

AC 가 **`no offset constants in code`** 입니다. 지금 `+10 / +5 / +20 / +21` 이
코드 두 군데에 박혀 있고 서로 어긋납니다 (A-1). 이 작업이 그걸 직접 없앱니다.

**설정 테이블의 모양은 DB 없이도 목으로 만들 수 있습니다.** 막는 건 숫자입니다 —
교수님 답이 이 작업의 내용 자체라, 답 없이 만들면 임시값을 한 겹 더 쌓는 셈입니다.

### E-3 · E-6. 스프레드시트가 있어야 하는 둘

- **부모 파서** — Breeders P열의 부모 표기 → 어미·아비 링크. AC 가 *"fixture set
  from real col-P values"*, 즉 실제 값이 있어야 시작합니다.
- **Breeders I–N** — 교배·plug·출산·조직·유전형 날짜를 쥐 상세에 읽기 전용 표시.
  임포트된 데이터가 있어야 보여줄 게 생깁니다.

둘 다 임포트 파이프라인 뒤입니다.

---

## F. 스키마가 가진 것 vs 클라이언트가 쓰는 것 — 테이블 재고 (2026-09-23 기준 스냅샷)


> ⚠️ **이 중 하나는 지금 당장 서버를 터뜨립니다.** `TaskSignal` 에 `'note'` 가
> 있는데 (`packages/types/src/task.ts:19`) `signals` 시드에는 `done`·`instruction`·
> `plan` 셋뿐입니다 (`0002_core_tables.sql:118-121`). 그리고 `resolveSignalId` 는
> 못 찾으면 **throw 합니다** (`sopRepository.ts:117`). `note` 신호가 달린 케이스가
> 서버에 닿는 순간 예외입니다 — 지금은 클라이언트가 서버를 안 불러서 안 터질 뿐입니다.

**왜 만들었나.** 한 세션에 세 번, 이미 스키마에 있는 것을 새로 만들자고 제안했고
아무도 몰랐습니다 — 리터 코드 카운터(E-1), Mate 케이스의 쥐 FK 둘(C-3), `cages`의
`memo` 컬럼(→ `notes`). 원인은 구조적입니다: 마이그레이션 `0001`–`0032`가 도메인을
꽤 완전히 모델링하는데 클라이언트는 그 일부만 씁니다. 그래서 "X가 필요하다"가
"X를 추가해야 한다"로 읽힙니다.

**출처.** `packages/db/migrations/0001`–`0032` 입니다. `SCHEMA.md`는 **0027 시점
화석**이라 쓰지 않았습니다 (D 섹션에 이미 적혀 있음). `0005`·`0006`·`0008`은
`0010`/`0021`이 그 산물을 전부 지워서 **무효(inert)**입니다 — 읽을 필요 없고,
파일이 남아 있는 건 러너의 누락 파일 가드 때문입니다 (`0010` 헤더).

**판정 기준.** "쓴다"는 (a) `packages/types` 에 DTO 가 있고 (b)
`apps/colony_client_web` 가 읽거나 쓰는 것입니다. `apps/colony_server` 의 SOP
자동생성기(`sopRepository.ts`)는 **클라이언트가 호출하지 않는 서버 전용 코드**라
별도로 표시했습니다 — 여기서 "미사용"은 화면이 안 쓴다는 뜻이지 죽은 테이블이라는
뜻이 아닙니다.

### F-0. 살아있는 테이블 21개

```
users  groups  group_members  signals  colonies  mouse_lines  cages  slots
mouse_meta  mice  mates  litters  audit_logs  mice_genes  notes  genes
cases  tasks  case_mice  punches  pup_number_offsets
```

`tasks` 는 `0021` 이 만든 `task_events` 를 `0023:21` 이 개명한 것입니다. `0005` 의
옛 `tasks` 와는 **다른 테이블**이고, `0017` 이 붙인 `tasks.prev_id` 는 그 옛 테이블과
함께 사라졌습니다 (`0021:60`). `mice_genes` 는 `mouse_genotypes` 의 개명입니다
(`0015:19`).

**이미 지워진 것 — 다시 만들자는 말이 나오면 이 줄을 보여주세요:**
`import_batches` · `raw_sheet_rows` · `import_errors` · `color_maps` (`0010`),
`mouse_events` (`0016:20`), 옛 `tasks` (`0021:60`). 열거형 `mouse_status` ·
`attention` (`0001`) 은 **어느 컬럼도 안 씁니다** — `mice.attention` 은 TEXT 입니다
(`0002:360`).

### F-1. 테이블별 판정

| 테이블 | 무엇인가 | 판정 | 놀고 있는 것 |
|---|---|---|---|
| `colonies` | 콜로니(= 워크북 한 권) | **사용** | — |
| `mouse_lines` | 마우스 라인(= 서브콜로니) | **사용** | — |
| `slots` | 케이지 안의 칸 | **사용** | — (`cage_id`+`label` 이 전부) |
| `mice_genes` | 쥐 ↔ 유전자 + 모계·부계 대립유전자 | **사용** | — |
| `tasks` | 케이스 상태 전이 로그(불변·추가전용) | **사용** | `actor_id` (클라는 표시 이름 문자열) |
| `case_mice` | 배치 케이스의 쥐 명단 | **사용** | — |
| `signals` | 신호 유형 + **색** | **부분** | **`color`** — F-3 a·F-4 ⑧ |
| `cages` | 케이지 | **부분** | `status` |
| `mouse_meta` | 출생 시 주어진 불변 정보 | **부분** | `raw_mouse_id`·`raw_genotype`·`raw_parents` |
| `mice` | 쥐의 **가변 상태** 버전 행 | **부분** | 아래 F-2 ⓐ — 8개 |
| `litters` | 한 배 | **부분** | 아래 F-2 ⓑ |
| `genes` | 유전자 카탈로그 | **부분** | `description` |
| `cases` | 케이스(작업) 본체 | **부분** | 아래 F-2 ⓒ — 여기가 핵심 |
| `punches` | 물리 펀치 한 개 = 한 행 | **부분** | `actor_id` |
| `pup_number_offsets` | 라벨의 `+N` 토큰 | **부분** | `actor_id`·`note` |
| `notes` | **모든 것에 붙는 메모** | **미사용** | 표 전체 — F-4 a |
| `mates` | 교배 **사이클**(단계별 버전 행) | **미사용**(서버만) | 표 전체 — F-2 ⓓ |
| `users` | 사람 **그리고** 그룹 | **미사용**(서버만) | 전체 (F-5 애매) |
| `groups` | 그룹 전용 메타 | **미사용** | 전체 (F-5 애매) |
| `group_members` | 그룹 멤버십 | **미사용** | 전체 (F-5 애매) |
| `audit_logs` | 누가 무엇을 했는지 | **미사용** | 전체 (F-5 애매) |

**합계: 사용 6 · 부분 9 · 미사용 6.**

### F-2. 부분 사용 — 어떤 컬럼이 놀고 있나

값이 몰려 있는 곳입니다. 세 번의 놀람이 전부 여기서 나왔습니다.

#### ⓐ `mice` — 이동·죽음·이력이 통째로 빈칸

화면이 읽는 것: `cage_id`·`slot_id`·`sex`·`is_alive`·`attention`. 그게 전부입니다.

노는 것 9개 (`0002:341`–`395`, `0012`, `0017:51`):

| 컬럼 | 스키마가 아는 것 | 화면이 하는 것 |
|---|---|---|
| `transit_status` | `waiting`→`issued`→`moved`→`verified` 4단계 | 드래그 한 번에 끝 (`lib/gridMove.ts:17`) |
| `death_reason` | 'sac' / 'found dead' … `is_alive=false` 일 때만 | `Sac` 태스크의 `reason` 칸이 `direction` JSON 으로 떠 있음 (`lib/taskTypes.ts:149`) |
| `effective_at` | **언제 사실이 됐는지** (created_at 과 다름) | 없음 |
| `reason`·`change_note` | 이 버전이 왜 생겼는지 | 없음 |
| `actor_id` | 누가 썼는지 | 없음 |
| `idempotency_key` | 재시도 중복 방지 | 없음 |
| `prev_id` | 낙관적 잠금(CAS) | 주석으로만 언급 (`gridMove.ts:5`) |
| **`line_id`** | **이 쥐가 속한 프로그램** (`0012`) | `MouseCell` 에 칸이 없음 — 아래 참고 |

**`mice.line_id` 가 특히 아깝습니다.** `0002:614`–`624` 가 일부러 "케이지의 라인과
쥐의 라인은 **정당하게 다를 수 있다** — 새끼를 다른 프로그램으로 옮기니까"라고
적고 그래서 복합 FK 를 안 걸었는데, 화면은 케이지 계층(`GridLine → GridCage`)으로만
라인을 압니다. 결과적으로 **이적(transfer)을 색으로 유추**하고 있습니다 —
`grid.ts:208` *"A mouse whose genotypeColor differs is a transfer"*. 그 사실을
정확히 모델링한 FK 가 이미 있는데 말입니다.

#### ⓑ `litters` — 리터 코드 한 글자만 건너옵니다

클라이언트에 닿는 건 `litter_code` 뿐이고, 그것도 `litters` 가 아니라
`mouse_meta.litter_code` 비정규화 복사본을 통해서입니다 (`MouseCell.litterCode`).

놉니다: **`seq`** (E-1 의 그 시퀀스, `0002:245`·`:540`), `mate_id`(→ 교배 사이클),
`is_from_outside`(외부 반입 쥐 구분), `pup_count`, `created_by`.

#### ⓒ `cases` — 주어 FK 7개 중 4개만 들고 있습니다

> **사장님께 드린 "여섯 중 하나"는 지금 기준으로는 틀렸습니다.** `9dda31d` 와
> `b5bb549` 가 그 사이에 고쳤습니다. 현재 상태는 아래가 맞습니다.

DTO(`packages/types/src/case.ts:22`)가 들고 있는 주어 핸들 **4개**:
`subjectMouseId` · `subjectCageId` · `subjectLitterCode` · `mice[]`(→ `case_mice`).
전부 `lib/caseSubjectLabel.ts:38` 에서 **살아있는 상태로부터** 이름을 조립합니다.

놀고 있는 주어 FK **3개**:

| 컬럼 | 상태 |
|---|---|
| `subject_mate_id` | **테이블에 있고 서버는 이미 씁니다** (`sopRepository.ts:164`). DTO 에는 없어서 Mate 케이스만 `"F6AYL × M4BCW"` 문자열 — C-3 의 그 결함 |
| `subject_slot_id` | 목 데이터에 `subjectKind:'slot'` 케이스가 **둘** 있는데 (`getTasks.mock.api.ts:120`·`:204`) DTO 에 칸이 없어 이름이 `null` 로 떨어집니다 |
| `subject_line_id` | `subjectKind:'line'` 케이스가 아직 하나도 없음 |

케이스 본체에서 노는 컬럼: `gen_key`(자동생성 멱등키 — 서버는 씀,
`sopRepository.ts:171`), `version`(낙관적 잠금, `0025`), `created_by`,
`actor_role`.

#### ⓓ `mates` — 화면의 `mates` 는 이 테이블이 아닙니다

`MouseCell.mates: MateRef[]` 가 있어서 쓰는 것처럼 보이지만, 목 데이터는
**아비 기준 묶음 색깔**을 넣고 있습니다 (`getColonyGrid.mock.api.ts:283`
"keyed by the father-fanout group"). 교배일·출산예정일·단계는 어디서도 안 읽습니다.

스키마가 가진 것: 6단계 상태(`pending`/`cohoused`/`awaiting`/`pregnant`/
`delivered`/`no_pups`), `occurred_at` + `~` 근사 플래그, `expected_delivery_on`
+ 근사 플래그, `origin_mate_id` 사이클 이력, `note`, 어미·아비 FK (`0002:456`).

**서버는 이미 씁니다** — `sopRepository.ts:33` 이 head 행을 읽어 plug check
케이스를 만듭니다. 화면만 안 씁니다.

### F-3. 반대 방향 — 화면이 쓰는데 스키마에 없는 것

**이쪽이 "미사용" 스무 줄보다 값이 큽니다.** 아홉 개 찾았습니다.

a **색 팔레트를 저장할 테이블이 없습니다.** `MouseCell.genotypeColor` 주석
(`packages/types/src/grid.ts:185`)은 *"Server resolves from
`color_assignments(channel='genotype')`"* 라고 적고 있고, `getPalette.mock.api.ts:7`
은 *"design-stage `color_palette` table"* 이라고 적습니다. **둘 다 존재한 적이
없습니다.** 비슷했던 `color_maps` 는 `0010:18` 에서 삭제됐습니다.
`GridLine.nominalGenotypeColor`·`MateRef.color` 도 같은 처지입니다.
→ C-1 이 이미 "팔레트를 어디에 저장할지"로 열어둔 문제입니다. 여기서 다시 정하지
마시고 C-1 에서 정하세요.

b **`cases` 에 담당자 칸이 없습니다.** 화면은 `assignee: 'Jia'` 를 들고 다니는데
(`getTasks.mock.api.ts:113`) `cases` 에 `assigned_to` 가 없습니다 — `0021:51` 헤더가
스스로 "absent … flag for architect review" 라고 적어뒀습니다. **그래서 `users`/
`groups` 가 있어도 "케이스를 그룹에 배정"은 지금 켤 수 없습니다.** F-4 에 안 넣은
이유입니다.

c **`direction` JSONB 도 없습니다.** Move 태스크의 `toCage`, Sac 의 `reason`,
Check food 의 `area` 가 전부 여기로 갑니다 (`lib/taskTypes.ts:130`–`151`). 같은
`0021:52` 줄이 함께 지적한 것입니다.

d **`MouseDates.tissue`/`genotyping` 을 담을 곳이 애매합니다.** `mouse_events` 를
지울 때 `0016:4` 는 *"이제 완료된 `tasks` 행의 `due_date`/`done_at` 에 기록된다"*
고 적었습니다. 그런데 `0021` 이후 `due_date` 는 `cases` 에 있고 `done_at` 은
**어느 테이블에도 없습니다**. 완료 시각은 `tasks.created_at` 으로 유추해야 합니다.
`0016` 헤더가 가리키는 모양과 실제 스키마가 어긋난 상태입니다.

e **`TaskSignal` 에 `'note'` 가 있는데 `signals` 에는 없습니다.**
`packages/types/src/task.ts:19` 는 `instruction|plan|note`, `0002:118` 시드는
`done|instruction|plan`. `'note'` 는 행이 없고 `'done'` 은 행이 있는데 아무도 안
씁니다. 서버의 `resolveSignalId` 는 **없는 type 이면 throw 합니다**
(`sopRepository.ts:117`) — DB 가 생기는 순간 터질 자리입니다.
⑨ **화면은 신호를 쥐에 붙이는데, 스키마는 일(work)에 붙입니다.** `MouseCell.signal`
이 `instruction`·`plan` 값을 직접 들고 있습니다 (`getColonyGrid.mock.api.ts:610`·
`:722`·`:756` 등 — `done` 다음으로 흔합니다). 그런데 `signal_id` 는 `cases` 와
`notes` 에만 있고 **`mice` 에는 신호 컬럼이 없습니다**. `dead`/`flag` 는
`is_alive`/`attention` 에서 파생이라 괜찮지만, `instruction`/`plan` 은 어디서
오는지 스키마에 자리가 없습니다. a과 함께 봐야 합니다 — 열린 케이스에서 파생할
것인지(`ColonyGridView.client.tsx` 가 배지에는 이미 그렇게 합니다), 쥐에 붙는
신호를 따로 저장할 것인지가 아직 안 정해졌습니다.

⑥ **Upcoming 화면에는 DTO 가 아예 없습니다.** `UpcomingItem`
(`getUpcoming.mock.api.ts:15`)은 `packages/types` 에 없고, 교배일·출생일이
하드코딩 상수(`MATING_A` 등)이며 `cases` 도 `mates` 도 안 봅니다. A-1 의 `+10/+20/
+21` 이 여기서 계산됩니다.

⑦ **`task_offset_rule` 테이블이 없습니다.** A-1·E-4 가 이미 아는 것 — 재확인만
합니다. 날짜 간격은 코드 두 군데에 박혀 있습니다.

⑧ **`MateRef.matedOn` 주석이 없는 테이블을 가리킵니다** — *"matings.mated_on"*
(`grid.ts:145`). `matings` 는 `0007:3` 이 적은 대로 `mates`+`litters` 로 쪼개졌습니다.
해당 값은 `mates.occurred_at` 입니다. 결함이 아니라 **낡은 주석**입니다.

### F-4. 마이그레이션 없이 지금 켤 수 있는 것 (유용한 순서)

a **케이지·슬롯·라인·콜로니 메모.** `notes` 는 완전 미사용인데 `0018:25` 가
`colony_id`·`cage_id`·`line_id`·`slot_id` 를 이미 붙여놨고, 원래부터
`subject_mouse_id`·`litter_id` 가 있습니다. 거기에 **작성자**(`actor_id`),
**시각**, **종류**(`note_type`), **신호**(`signal_id`), **버전 이력**
(`origin_note_id`+`prev_id`)까지 딸려 옵니다. `cages` 에 `memo TEXT` 를 붙이자는
제안보다 모든 면에서 낫습니다. **필요한 것은 DTO 하나뿐입니다.**

b **Mate 케이스가 `mates` 행을 가리키게.** C-3 에서 이미 결정됐고,
`cases.subject_mate_id` 가 있고, **서버 삽입 경로도 이미 있습니다**
(`sopRepository.ts:164`). 막는 건 `mates` 행을 만드는 UI 뿐입니다(E-5 와 같은 자리).
DTO 에 `subjectMateId` 한 칸 추가가 클라이언트 쪽 작업 전부입니다.

c **`mice.transit_status` 로 이동을 2단계로.** 지금은 드래그 한 번에 끝나서
"옮기라고 지시함"과 "실제로 옮김"이 구분이 안 됩니다. 스키마는 네 단계를 이미
구분하고 기본값이 `verified`(= 제자리) 라서, **안 쓰면 기존 동작 그대로**입니다.
랙과 화면을 일치시키는 게 이 저장소의 목적이라면 이게 가장 직접적입니다.

d **Sac 의 `reason` 을 `mice.death_reason` 으로.** 지금은 `direction` JSON —
c의 `direction` 은 테이블조차 없는데(F-3 c) `death_reason` 은 **있습니다**.
`CHECK (death_reason IS NULL OR is_alive = false)` 까지 붙어 있습니다
(`0002:358`).

e **리터 코드를 `litters.seq` 에서.** E-1 이 다 적어뒀습니다 — 시퀀스도
(`0002:245`) 코덱도(`lib/litterCode.ts`) 이미 있습니다. DB 뒤입니다.

⑥ **Upcoming 을 `mates` 단계에서.** `expected_delivery_on` 과 `~` 근사 플래그가
이미 컬럼입니다. 지금 하드코딩된 `+20` 을 지우는 길이 여기입니다 — 다만
**A-1 의 교수님 답이 먼저**입니다(E-4).

⑦ **`cases.gen_key` 로 자동생성 중복 방지.** 서버는 이미 씁니다. 클라이언트가
케이스를 만들 때 같은 키 규칙을 쓰면 하루 두 번 돌려도 안 겹칩니다.

⑧ **신호 색을 데이터로.** `signals.color` 가 컬럼인데 색은 `lib/signal.ts` 와
`globals.css` 에 박혀 있습니다. `0002:100` 이 *"교수님이 마이그레이션 없이 신호를
추가할 수 있게"* 하려고 테이블로 승격한 것인데 그 목적이 안 살아 있습니다.
(단 F-3 e 의 `'note'` 행 누락을 같이 고쳐야 합니다.)

⑨ **`mice.line_id` 로 이적을 색이 아니라 사실로.** F-2 ⓐ 끝의 그 건입니다.
`MouseCell` 에 `lineId` 한 칸이면 "이 쥐는 케이지의 라인과 다른 프로그램"이
색 비교가 아니라 비교 한 번이 됩니다.

⑩ 잔돈: `cages.status`, `genes.description`, `litters.is_from_outside`(외부 반입
쥐 표시), `punches.actor_id`·`pup_number_offsets.actor_id`(누가 기록했는지).

### F-5. 애매하거나 확인 못 한 것

- **`users`·`groups`·`group_members`** — 모델링은 돼 있지만(그룹도 `users` 행,
  `0002:28`) 인증이 P2 이고 `cases` 에 담당자 FK 가 없어(F-3 b) **아직 아무것도
  쓸 수 없는 상태**입니다. 미사용으로 세긴 했지만 "지울 수 있다"는 뜻은 아닙니다.
  `0022` 가 시스템 유저 한 행을 시드합니다.
- **`audit_logs`** — 서버 쓰기 경로가 아직 없어 쓸 수가 없습니다. 미사용이 아니라
  **아직 차례가 아닌 것**입니다. `0019` 가 `updated_at`/`deleted_at` 을 떼고
  `request_id`·`on_behalf_of_id`(대리 실행)를 붙여 **진짜 불변**으로 만들어뒀습니다
  — 소프트 삭제 규칙의 인정된 예외입니다.
- `packages/domain` 은 판정에서 뺐습니다 — `CLAUDE.md:38` 이 *"pure domain logic
  (parsers, codecs) — no I/O"* 라고 못박고 있어 테이블을 건드릴 수 없습니다.
  위 판정은 `packages/types` + `apps/colony_client_web` + `apps/colony_server`
  기준입니다.
- `0003`·`0019`·`0020` 은 확인했습니다 — 테이블을 만들거나 지우지 않아 재고에
  영향 없음. 다만 `0003` 은 **DDL 이 한 줄도 없는 빈 파일**(`SELECT 1;`)이고,
  헤더가 존재한 적 없는 `mouse_ids` 테이블을 설명합니다. 낡은 주석입니다.
- `_archive/` 는 읽지 않았습니다 (`rules/docs.md` §3 읽기 가드).
