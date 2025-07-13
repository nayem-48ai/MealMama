document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE & HELPER FUNCTIONS ---
    let allData = JSON.parse(localStorage.getItem('messData_v4')) || {};
    const monthSelector = document.getElementById('monthSelector');
    
    const getCurrentMonth = () => monthSelector.value;

    function getCurrentMonthData() {
        const month = getCurrentMonth();
        if (!allData[month]) {
            allData[month] = { members: [], expenses: [], meals: {} };
        }
        return allData[month];
    }

    const getTotalDeposit = (member) => member.deposits.reduce((acc, val) => acc + val, 0);

    function saveData() {
        localStorage.setItem('messData_v4', JSON.stringify(allData));
    }

    // --- RENDER FUNCTIONS ---
    function renderMembers() {
        const data = getCurrentMonthData();
        const tableBody = document.getElementById("membersTableBody");
        tableBody.innerHTML = "";
        data.members.forEach(member => {
            const totalDeposit = getTotalDeposit(member);
            const depositHistory = member.deposits.join(' + ').replace(/\+ -/g, '- ');
            const row = `<tr>
                            <td>${member.name}</td>
                            <td>${depositHistory || 'N/A'}</td>
                            <td>${totalDeposit}</td>
                            <td class="no-print"><button class="remove-btn" data-name="${member.name}">মুছুন</button></td>
                         </tr>`;
            tableBody.innerHTML += row;
        });
    }
    
    function renderExpenses() {
        const data = getCurrentMonthData();
        const tableBody = document.getElementById("expenseTableBody");
        tableBody.innerHTML = "";
        // Sort expenses by date before rendering
        data.expenses.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(expense => {
            const row = `<tr><td>${expense.date}</td><td>${expense.category}</td><td>${expense.amount}</td></tr>`;
            tableBody.innerHTML += row;
        });
    }
    
    function renderMealTable() {
        const data = getCurrentMonthData();
        const [year, month] = getCurrentMonth().split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const tableHeader = document.getElementById('mealTableHeader');
        const tableBody = document.getElementById('mealTableBody');
        tableHeader.innerHTML = ''; tableBody.innerHTML = '';

        let headerHTML = '<tr><th rowspan="2">সদস্যের নাম</th>';
        for (let day = 1; day <= daysInMonth; day++) headerHTML += `<th colspan="3">${day}</th>`;
        headerHTML += '<th rowspan="2">মাসিক মোট</th></tr>';
        let subHeaderHTML = '<tr>';
        for (let day = 1; day <= daysInMonth; day++) subHeaderHTML += `<th>স</th><th>দু</th><th>রা</th>`;
        subHeaderHTML += '</tr>';
        tableHeader.innerHTML = headerHTML + subHeaderHTML;

        data.members.forEach(member => {
            let rowHTML = `<tr><td>${member.name}</td>`;
            let memberMonthlyTotal = 0;
            if (data.meals[member.name]) {
                 Object.values(data.meals[member.name]).forEach(dayMeals => {
                    memberMonthlyTotal += (dayMeals.b || 0) + (dayMeals.l || 0) + (dayMeals.d || 0);
                });
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayMeals = data.meals[member.name]?.[dateStr] || { b: 0, l: 0, d: 0 };
                rowHTML += `<td><input type="number" min="0" value="${dayMeals.b}" data-member="${member.name}" data-date="${dateStr}" data-meal="b"></td>`;
                rowHTML += `<td><input type="number" min="0" value="${dayMeals.l}" data-member="${member.name}" data-date="${dateStr}" data-meal="l"></td>`;
                rowHTML += `<td><input type="number" min="0" value="${dayMeals.d}" data-member="${member.name}" data-date="${dateStr}" data-meal="d"></td>`;
            }
            rowHTML += `<td>${memberMonthlyTotal}</td></tr>`;
            tableBody.innerHTML += rowHTML;
        });
    }

    function renderCalculations() {
        const data = getCurrentMonthData();
        const totalExpense = data.expenses.reduce((acc, expense) => acc + expense.amount, 0);
        
        let totalMeals = 0;
        Object.values(data.meals).forEach(memberMeals => {
            if (memberMeals) {
                Object.values(memberMeals).forEach(dayMeals => totalMeals += (dayMeals.b || 0) + (dayMeals.l || 0) + (dayMeals.d || 0));
            }
        });

        const mealRate = totalMeals > 0 ? totalExpense / totalMeals : 0;
        document.getElementById("totalExpense").textContent = totalExpense;
        document.getElementById("totalMeals").textContent = totalMeals;
        document.getElementById("mealRate").textContent = mealRate.toFixed(2);

        const finalTableBody = document.getElementById("finalCalculationBody");
        finalTableBody.innerHTML = "";
        data.members.forEach(member => {
            let memberTotalMeals = 0;
            if (data.meals[member.name]) {
                Object.values(data.meals[member.name]).forEach(dayMeals => memberTotalMeals += (dayMeals.b || 0) + (dayMeals.l || 0) + (dayMeals.d || 0));
            }
            const memberCost = memberTotalMeals * mealRate;
            const totalDeposit = getTotalDeposit(member);
            const balance = totalDeposit - memberCost;
            const balanceClass = balance >= 0 ? 'positive-balance' : 'negative-balance';
            finalTableBody.innerHTML += `<tr>
                <td>${member.name}</td><td>${memberTotalMeals}</td>
                <td>${memberCost.toFixed(2)}</td><td>${totalDeposit}</td>
                <td class="${balanceClass}">${balance.toFixed(2)}</td>
            </tr>`;
        });
    }
    
    // The corrected master render function
    function renderAll() {
        renderMembers();
        renderExpenses(); // This line was missing before
        renderMealTable();
        renderCalculations();
        saveData();
    }

    // --- EVENT HANDLERS ---
    document.getElementById('addMemberForm').addEventListener('submit', e => {
        e.preventDefault();
        const data = getCurrentMonthData();
        const nameInput = document.getElementById('memberNameInput');
        const amountInput = document.getElementById('depositAmount');
        const name = nameInput.value.trim();
        const amount = parseInt(amountInput.value);
        if (name && !isNaN(amount) && amount !== 0) {
            let existingMember = data.members.find(m => m.name === name);
            if (existingMember) {
                existingMember.deposits.push(amount);
            } else {
                data.members.push({ name: name, deposits: [amount] });
            }
            e.target.reset();
            renderAll();
        }
    });
    
    document.getElementById('addExpenseForm').addEventListener('submit', e => {
        e.preventDefault();
        const data = getCurrentMonthData();
        const date = document.getElementById('expenseDate').value;
        const category = document.getElementById('expenseCategory').value.trim();
        const amount = parseInt(document.getElementById('expenseAmount').value);
        if (date && category && !isNaN(amount) && amount > 0) {
            data.expenses.push({ date, category, amount });
            e.target.reset();
            renderAll();
        }
    });

    document.getElementById('mealTableBody').addEventListener('change', e => {
        if (e.target.tagName === 'INPUT') {
            const data = getCurrentMonthData();
            const { member, date, meal } = e.target.dataset;
            const value = parseInt(e.target.value) || 0;
            if (!data.meals[member]) data.meals[member] = {};
            if (!data.meals[member][date]) data.meals[member][date] = { b: 0, l: 0, d: 0 };
            data.meals[member][date][meal] = value;
            renderAll();
        }
    });

    document.getElementById('membersTableBody').addEventListener('click', e => {
        if (e.target.classList.contains('remove-btn')) {
            const name = e.target.dataset.name;
            if (confirm(`আপনি কি নিশ্চিতভাবে "${name}" সদস্যকে এই মাসের হিসাব থেকে মুছে ফেলতে চান?`)) {
                const data = getCurrentMonthData();
                data.members = data.members.filter(m => m.name !== name);
                delete data.meals[name];
                renderAll();
            }
        }
    });
    
    monthSelector.addEventListener('change', renderAll);
    
    document.getElementById('printBtn').addEventListener('click', () => {
        window.print();
    });

    // --- Autocomplete Logic ---
    const memberNameInput = document.getElementById('memberNameInput');
    const nameSuggestions = document.getElementById('nameSuggestions');
    memberNameInput.addEventListener('input', () => {
        const data = getCurrentMonthData();
        const input = memberNameInput.value.toLowerCase();
        nameSuggestions.innerHTML = '';
        if (!input) return;
        const filtered = data.members.filter(m => m.name.toLowerCase().includes(input));
        filtered.forEach(member => {
            const div = document.createElement('div');
            div.textContent = member.name;
            div.addEventListener('click', () => {
                memberNameInput.value = member.name;
                nameSuggestions.innerHTML = '';
            });
            nameSuggestions.appendChild(div);
        });
    });
    document.addEventListener('click', (e) => {
        if (e.target.id !== 'memberNameInput') nameSuggestions.innerHTML = '';
    });

    // --- Daily Meal Modal Logic ---
    const modal = document.getElementById('dailyMealModal');
    const showBtn = document.getElementById('showDailyMealModalBtn');
    const closeBtn = modal.querySelector('.close-btn');
    const saveBtn = document.getElementById('saveDailyMealsBtn');
    const dailyMealDate = document.getElementById('dailyMealDate');
    const applyBulkMealBtn = document.getElementById('applyBulkMealBtn');
    const clearDailyMealsBtn = document.getElementById('clearDailyMealsBtn');

    function populateDailyMealModal() {
        const data = getCurrentMonthData();
        const date = dailyMealDate.value;
        const tableBody = document.getElementById('dailyMealTableBody');
        tableBody.innerHTML = '';
        if (!date) return;
        data.members.forEach(member => {
            const dayMeals = data.meals[member.name]?.[date] || { b: 0, l: 0, d: 0 };
            const row = `<tr><td>${member.name}</td><td><input type="number" min="0" value="${dayMeals.b}" data-member="${member.name}" data-meal="b"></td><td><input type="number" min="0" value="${dayMeals.l}" data-member="${member.name}" data-meal="l"></td><td><input type="number" min="0" value="${dayMeals.d}" data-member="${member.name}" data-meal="d"></td></tr>`;
            tableBody.innerHTML += row;
        });
    }

    showBtn.onclick = () => { dailyMealDate.valueAsDate = new Date(); populateDailyMealModal(); modal.style.display = 'block'; };
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };
    dailyMealDate.onchange = populateDailyMealModal;

    applyBulkMealBtn.onclick = () => {
        const amount = document.getElementById('bulkMealAmount').value;
        const applyBreakfast = document.getElementById('bulkMealBreakfast').checked;
        const applyLunch = document.getElementById('bulkMealLunch').checked;
        const applyDinner = document.getElementById('bulkMealDinner').checked;
        if (amount === '' || (!applyBreakfast && !applyLunch && !applyDinner)) {
            alert('অনুগ্রহ করে মিল সংখ্যা লিখুন এবং অন্তত একটি বেলা নির্বাচন করুন।');
            return;
        }
        const mealValue = parseInt(amount) || 0;
        document.querySelectorAll('#dailyMealTableBody tr').forEach(row => {
            if (applyBreakfast) row.querySelector('input[data-meal="b"]').value = mealValue;
            if (applyLunch) row.querySelector('input[data-meal="l"]').value = mealValue;
            if (applyDinner) row.querySelector('input[data-meal="d"]').value = mealValue;
        });
    };

    saveBtn.onclick = () => {
        const data = getCurrentMonthData();
        const date = dailyMealDate.value;
        if (!date) { alert('অনুগ্রহ করে একটি তারিখ নির্বাচন করুন।'); return; }
        document.querySelectorAll('#dailyMealTableBody input').forEach(input => {
            const { member, meal } = input.dataset;
            const value = parseInt(input.value) || 0;
            if (!data.meals[member]) data.meals[member] = {};
            if (!data.meals[member][date]) data.meals[member][date] = { b: 0, l: 0, d: 0 };
            data.meals[member][date][meal] = value;
        });
        modal.style.display = 'none';
        renderAll();
    };

    clearDailyMealsBtn.onclick = () => {
        const date = dailyMealDate.value;
        if (!date) { alert('অনুগ্রহ করে একটি তারিখ নির্বাচন করুন।'); return; }
        if (confirm(`আপনি কি নিশ্চিতভাবে ${date} তারিখের সমস্ত মিলের হিসাব মুছে ফেলতে চান? এটি ফিরিয়ে আনা যাবে না।`)) {
            const data = getCurrentMonthData();
            data.members.forEach(member => {
                if (data.meals[member.name] && data.meals[member.name][date]) {
                    delete data.meals[member.name][date];
                }
            });
            modal.style.display = 'none';
            renderAll();
        }
    };

    // --- INITIALIZATION ---
    function initialize() {
        const today = new Date();
        monthSelector.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        renderAll();
    }
    
    initialize();
});