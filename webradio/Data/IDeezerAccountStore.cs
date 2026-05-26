using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Webradio.Data;

public interface IDeezerAccountStore
{
    event Action OnAccountsChanged;
    Task<List<DeezerAccountEntity>> GetAllAsync();
    Task<DeezerAccountEntity?> GetByIdAsync(Guid id);
    Task<DeezerAccountEntity?> GetActiveAccountAsync();
    Task<DeezerAccountEntity> CreateAsync(DeezerAccountEntity entity);
    Task<DeezerAccountEntity?> UpdateAsync(Guid id, DeezerAccountEntity entity);
    Task<bool> DeleteAsync(Guid id);
    Task IncrementRequestCountAsync(Guid id);
    Task SetActiveStatusAsync(Guid id, bool isActive);
}
