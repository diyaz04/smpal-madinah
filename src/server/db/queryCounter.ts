/**
 * Cloudflare Workers Free plan membatasi 50 subrequest (termasuk query D1)
 * per eksekusi Worker. Wrapper ini membungkus binding D1 supaya setiap
 * `prepare()` (dan setiap statement di dalam `batch()`) dihitung per-request,
 * lalu memberi peringatan di konsol dev saat mendekati batas (>40).
 *
 * Hanya aktif saat ENVIRONMENT !== "production" supaya tidak menambah
 * overhead CPU di production.
 */
export interface QueryCounter {
  count: number;
  warned: boolean;
}

const WARN_THRESHOLD = 40;

export function createQueryCounter(): QueryCounter {
  return { count: 0, warned: false };
}

export function wrapD1WithCounter(d1: D1Database, counter: QueryCounter): D1Database {
  const track = () => {
    counter.count += 1;
    if (!counter.warned && counter.count > WARN_THRESHOLD) {
      counter.warned = true;
      console.warn(
        `[queryCounter] Request ini sudah menjalankan ${counter.count} query D1, ` +
          `mendekati batas 50 subrequest/invocation Free plan.`,
      );
    }
  };

  return new Proxy(d1, {
    get(target, prop, receiver) {
      if (prop === "prepare") {
        return (sqlText: string) => {
          track();
          return target.prepare(sqlText);
        };
      }
      if (prop === "batch") {
        return (statements: D1PreparedStatement[]) => {
          counter.count += statements.length;
          if (!counter.warned && counter.count > WARN_THRESHOLD) {
            counter.warned = true;
            console.warn(
              `[queryCounter] Request ini sudah menjalankan ${counter.count} query D1 (via batch), ` +
                `mendekati batas 50 subrequest/invocation Free plan.`,
            );
          }
          return target.batch(statements);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
