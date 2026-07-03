/**
 * Abstract base class for every Mongoose repository.
 *
 * Why this exists (same reason UseCase<TInput, TOutput> exists):
 * Every repository in this project has the same structural pattern —
 * a `mapToEntity` method that converts a raw Mongoose document into a
 * clean domain entity. Without this base class, that pattern is just
 * a convention everyone happens to follow. With it, TypeScript enforces
 * that every concrete repository implements `mapToEntity`, and any
 * future shared behavior (e.g. error logging, caching) can be added
 * here once instead of in every repository separately.
 *
 * TEntity is the domain entity type this repository manages
 * (IUser, IOTPSession, IAppeal, etc.)
 */
export abstract class BaseRepository<TEntity> {
  /**
   * Converts a raw Mongoose document (typed as `any` because Mongoose's
   * internal document types don't cleanly match our domain entity shapes)
   * into a clean, framework-independent domain entity.
   *
   * Every subclass MUST implement this — the abstract keyword enforces
   * that at compile time, exactly like the abstract `execute()` on UseCase.
   */
  protected abstract mapToEntity(doc: any): TEntity;
}
