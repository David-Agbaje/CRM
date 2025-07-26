let customers = JSON.parse(localStorage.getItem("customers")) || [];

function saveCustomers() {
  localStorage.setItem("customers", JSON.stringify(customers));
}

function renderCustomers() {
  const list = document.getElementById("customer-list");
  list.innerHTML = "";

  customers.forEach((customer, index) => {
    const li = document.createElement("li");
    li.className = "customer";
    li.innerHTML = `
      <strong>${customer.name}</strong>
      <div class="meta">📧 ${customer.email}</div>
      <div class="meta">📞 ${customer.phone}</div>
      <div class="meta">📝 ${customer.notes || "No notes"}</div>
      <div class="buttons">
        <button class="edit-btn" onclick="editCustomer(${index})">Edit</button>
        <button class="delete-btn" onclick="deleteCustomer(${index})">Delete</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function addCustomer(customer) {
  customers.push(customer);
  saveCustomers();
  renderCustomers();
}

function deleteCustomer(index) {
  if (confirm("Are you sure you want to delete this customer?")) {
    customers.splice(index, 1);
    saveCustomers();
    renderCustomers();
  }
}

function editCustomer(index) {
  const customer = customers[index];
  document.getElementById("name").value = customer.name;
  document.getElementById("email").value = customer.email;
  document.getElementById("phone").value = customer.phone;
  document.getElementById("notes").value = customer.notes;
  customers.splice(index, 1);
  saveCustomers();
  renderCustomers();
}

document.getElementById("customer-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const notes = document.getElementById("notes").value.trim();

  if (name && email && phone) {
    addCustomer({ name, email, phone, notes });
    this.reset();
  }
});

renderCustomers();
