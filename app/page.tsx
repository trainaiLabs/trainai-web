import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#faf7ff] text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="text-2xl font-bold text-[#7c3aed]">TrainAI</div>
          <nav className="flex gap-5 text-sm text-slate-600">
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보처리방침</Link>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-12 py-20 md:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-[#7c3aed] shadow-sm">
              AI 트레이닝 참여 플랫폼
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              AI를 만드는 사람은
              <br />
              따로 있지 않습니다.
              <br />
              <span className="bg-gradient-to-r from-[#8b5cf6] to-[#c084fc] bg-clip-text text-transparent">
                바로 당신입니다.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              TrainAI는 사용자가 AI의 답변을 비교하고 평가하면서 더 나은
              AI를 만드는 데 직접 참여할 수 있는 플랫폼입니다.
              <br />
              당신의 선택 하나하나가 AI의 학습 데이터가 됩니다.
              <br /><br />
              AI를 가르치는 간단한 퀘스트에 참여하고, 쌓인 포인트는 출금 신청을 통해 실제 보상으로 받을 수 있습니다.
              <br />
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#reward"
                className="rounded-xl bg-[#8b5cf6] px-6 py-3 font-semibold text-white shadow-lg shadow-purple-200 transition hover:bg-[#7c3aed]"
              >
                포인트 보상 알아보기
              </Link>
              <Link
                href="#about"
                className="rounded-xl bg-white px-6 py-3 font-semibold text-[#7c3aed] shadow-sm transition hover:bg-purple-50"
              >
                서비스 알아보기
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-purple-100">
            <div className="rounded-2xl bg-[#f3e8ff] p-6">
              <p className="text-sm font-semibold text-[#7c3aed]">오늘의 퀘스트</p>
              <h2 className="mt-3 text-2xl font-bold">
                더 좋은 AI 답변을 선택해주세요
              </h2>
              <div className="mt-6 space-y-3">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  답변 A: 자연스럽고 정확한 설명
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  답변 B: 어색하고 부족한 설명
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-[#8b5cf6] px-4 py-3 text-center font-semibold text-white">
                선택하고 포인트 받기
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl p-8">
          <h2 className="text-3xl font-bold">AI는 혼자 성장하지 않습니다</h2>
          <p className="mt-4 max-w-2xl text-slate-600">
            AI는 사람의 판단을 통해 더 좋은 방향으로 학습합니다. TrainAI에서
            사용자는 단순한 이용자가 아니라 AI를 가르치는 참여자가 됩니다.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <FeatureCard
              title="간단한 퀘스트"
              text="두 답변 중 더 좋은 답변을 선택하거나 문장의 자연스러움을 평가합니다."
            />
            <FeatureCard
              title="AI 학습 기여"
              text="당신의 선택은 더 좋은 AI를 만들기 위한 학습 데이터가 됩니다."
            />
            <FeatureCard
              title="포인트와 XP"
              text="참여한 만큼 포인트와 경험치가 쌓이고 티어가 성장합니다."
            />
          </div>
        </div>
      </section>

      <section id="reward" className="bg-[#faf7ff] px-6 py-16">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
          <div className="inline-flex rounded-full bg-[#f3e8ff] px-4 py-2 text-sm font-bold text-[#7c3aed]">
            포인트 출금 가능
          </div>

          <h2 className="mt-5 text-3xl font-bold">기여에 대한 보상</h2>

          <p className="mt-4 max-w-3xl text-lg font-medium leading-8 text-slate-700">
            퀘스트를 완료하면 포인트와 XP를 얻을 수 있습니다.
            적립된 포인트는 서비스 정책에 따라 출금 신청을 통해 실제 보상으로 받을 수 있습니다.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#faf7ff] p-5">
              <p className="text-sm font-bold text-[#7c3aed]">STEP 1</p>
              <p className="mt-2 font-bold">퀘스트 참여</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                AI 답변을 비교하고 더 좋은 선택을 고릅니다.
              </p>
            </div>

            <div className="rounded-2xl bg-[#faf7ff] p-5">
              <p className="text-sm font-bold text-[#7c3aed]">STEP 2</p>
              <p className="mt-2 font-bold">포인트 적립</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                참여 결과에 따라 포인트와 XP가 쌓입니다.
              </p>
            </div>

            <div className="rounded-2xl bg-[#faf7ff] p-5">
              <p className="text-sm font-bold text-[#7c3aed]">STEP 3</p>
              <p className="mt-2 font-bold">출금 신청</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                적립된 포인트는 출금 신청을 통해 보상받을 수 있습니다.
              </p>
            </div>
          </div>

          <p className="mt-8 text-xl font-extrabold text-[#7c3aed]">
            참여한 만큼, 포인트가 쌓이고 실제 보상으로 이어집니다.
          </p>
        </div>
      </section>

      <section className="bg-white px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold">
            지금 바로 AI 학습에 참여해보세요
          </h2>

          <p className="mt-4 text-lg text-slate-600">
            간단한 선택만으로 AI를 더 똑똑하게 만들고, 포인트를 쌓아 실제 보상으로 이어집니다.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <a
              href="#reward"
              className="rounded-xl bg-[#7c3aed] px-6 py-3 font-bold text-white shadow-lg shadow-purple-200 hover:bg-[#6d28d9]"
            >
              보상 확인하고 시작하기
            </a>
            <p className="mt-4 text-sm text-slate-500">
              TrainAI 앱은 현재 출시 준비 중입니다.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-white px-6 py-10 text-center text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span>© 2026 TrainAI. All rights reserved.</span>
          <Link href="/terms" className="hover:text-[#7c3aed]">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-[#7c3aed]">
            개인정보처리방침
          </Link>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-[#7c3aed]">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </div>
  );
}