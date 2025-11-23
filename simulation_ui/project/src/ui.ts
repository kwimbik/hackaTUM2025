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
    
    const nameCell = document.createElement("td");
    nameCell.style.padding = "8px";
    nameCell.style.fontWeight = "700";
    nameCell.textContent = branch.name;
    
    const moneyCell = document.createElement("td");
    moneyCell.style.padding = "8px";
    moneyCell.textContent = `$${branch.money.toLocaleString()}`;
    
    const wageCell = document.createElement("td");
    wageCell.style.padding = "8px";
    wageCell.textContent = `$${branch.monthlyWage.toLocaleString()}`;
    
    const loanCell = document.createElement("td");
    loanCell.style.padding = "8px";
    loanCell.textContent = `$${branch.currentLoan.toLocaleString()}`;
    
    const statusCell = document.createElement("td");
    statusCell.style.padding = "8px";
    statusCell.textContent = branch.maritalStatus;
    
    const kidsCell = document.createElement("td");
    kidsCell.style.padding = "8px";
    kidsCell.textContent = branch.childCount.toString();
    
    const healthCell = document.createElement("td");
    healthCell.style.padding = "8px";
    healthCell.textContent = branch.healthStatus;
    
    row.appendChild(nameCell);
    row.appendChild(moneyCell);
    row.appendChild(wageCell);
    row.appendChild(loanCell);
    row.appendChild(statusCell);
    row.appendChild(kidsCell);
    row.appendChild(healthCell);
    
    tbody.appendChild(row);
  }
}