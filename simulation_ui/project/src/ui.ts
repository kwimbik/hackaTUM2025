import { branches } from './branches.js';

// Update the stats table display
export function updateStatsTable() {
  const tbody = document.getElementById("statsTableBody")!;
  tbody.innerHTML = '';
  
  // Sort branches by ID in ascending order
  const sortedBranches = [...branches].sort((a, b) => a.id - b.id);
  
  for (const branch of sortedBranches) {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #ccc";
    
    const branchCell = document.createElement("td");
    branchCell.style.padding = "8px";
    branchCell.textContent = `#${branch.id}`;
    
    const moneyCell = document.createElement("td");
    moneyCell.style.padding = "8px";
    moneyCell.textContent = `$${branch.money.toLocaleString()}`;
    
    const wageCell = document.createElement("td");
    wageCell.style.padding = "8px";
    wageCell.textContent = `$${branch.monthlyWage.toLocaleString()}`;
    
    const statusCell = document.createElement("td");
    statusCell.style.padding = "8px";
    statusCell.textContent = branch.maritalStatus;
    
    const kidsCell = document.createElement("td");
    kidsCell.style.padding = "8px";
    kidsCell.textContent = branch.hasChildren ? "Yes" : "No";
    
    row.appendChild(branchCell);
    row.appendChild(moneyCell);
    row.appendChild(wageCell);
    row.appendChild(statusCell);
    row.appendChild(kidsCell);
    
    tbody.appendChild(row);
  }
}
