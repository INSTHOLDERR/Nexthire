export abstract class BaseRepository<TEntity> {
  protected abstract mapToEntity(doc: any): TEntity;
}
