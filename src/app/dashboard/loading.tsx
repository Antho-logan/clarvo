export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto pb-12 animate-pulse">
      <div className="mb-8">
        <div className="h-10 w-64 rounded bg-[#D8D2C8]/70 mb-3" />
        <div className="h-5 w-96 max-w-full rounded bg-[#EEEDE4]" />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,2fr)_360px] gap-8">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#D8D2C8] bg-white p-6 h-40" />
          <div className="grid gap-6">
            <div className="rounded-2xl border border-[#D8D2C8] bg-white p-6 h-52" />
            <div className="rounded-2xl border border-[#D8D2C8] bg-white p-6 h-52" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8D2C8] bg-white p-6 h-[28rem]" />
      </div>
    </div>
  );
}
