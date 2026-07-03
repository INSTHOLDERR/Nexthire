/**
 * Abstract base class every use case extends.
 *
 * Why an `abstract class` here and not just an interface (like the rest of
 * the codebase uses for repositories/services):
 *
 * - `execute()` is declared but has NO body — subclasses are FORCED to
 *   implement it. `new UseCase()` directly is illegal at compile time
 *   (TypeScript blocks instantiating an abstract class), so this can only
 *   ever be used through a concrete subclass like `RegisterUseCase`.
 * - Unlike an interface, an abstract class is a real runtime construct
 *   (it compiles to an actual JS class via TypeScript's output), and it
 *   CAN hold shared, already-implemented logic for all subclasses to
 *   inherit — see `assertExists` below, which every use case can reuse
 *   instead of repeating the same null-check pattern.
 *
 * `TInput` / `TOutput` are generics — every use case fills these in with
 * its own real input/output shape (e.g. RegisterUseCase uses
 * `UseCase<{ email, password }, { email }>`), so this stays fully typed
 * rather than degrading to `any`.
 */
export abstract class UseCase<TInput, TOutput> {
  /** Every use case MUST implement this. No default body exists for it. */
  abstract execute(input: TInput): Promise<TOutput>;

  /**
   * Shared helper, inherited by every subclass for free — this is the part
   * a plain interface could never give you, since interfaces can't carry
   * implemented logic, only signatures.
   */
  protected assertExists<T>(value: T | null | undefined, message: string): T {
    if (value === null || value === undefined) {
      throw new Error(message);
    }
    return value;
  }
}
