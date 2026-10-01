export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#fbf9f5] lg:ps-[260px]">
      <div className="border-b border-[#dfe5ec] px-8 py-5">
        <div className="h-7 w-40 animate-pulse rounded bg-[#f4efea]" />
      </div>
      <div className="grid gap-3 px-8 py-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-6 gap-3 rounded-xl border border-[#dfe5ec] bg-white px-4 py-4"
          >
            {Array.from({ length: 6 }, (_, cell) => (
              <div key={cell} className="h-4 animate-pulse rounded bg-[#f4efea]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
