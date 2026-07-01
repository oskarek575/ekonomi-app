type Props = {
  title: string;
  value: string | number;
  icon: string;
};

export default function StatisticsCard({
  title,
  value,
  icon,
}: Props) {
  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-zinc-800
        bg-gradient-to-br
        from-zinc-900
        via-zinc-900
        to-zinc-950
        p-7
        shadow-xl
        transition-all
        duration-300
        hover:-translate-y-2
        hover:border-green-500/40
        hover:shadow-green-500/20
      "
    >

      <div
        className="
          absolute
          -right-8
          -top-8
          h-28
          w-28
          rounded-full
          bg-green-500/10
          blur-3xl
        "
      />

      <div className="relative flex justify-between items-start">

        <div>

          <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider">
            {title}
          </p>

          <h2 className="text-5xl font-black mt-4 text-white">
            {value}
          </h2>

        </div>

        <div
          className="
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            bg-green-500/15
            text-3xl
            backdrop-blur
          "
        >
          {icon}
        </div>

      </div>

    </div>
  );
}