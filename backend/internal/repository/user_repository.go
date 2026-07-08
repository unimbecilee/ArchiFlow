package repository

import (
	"strings"
	"time"

	"archiflow/backend/internal/models"

	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *models.User) error
	GetByID(id uint) (*models.User, error)
	GetByEmail(email string) (*models.User, error)
	Update(user *models.User) error
	UpdateLastLogin(id uint) error
	Delete(id uint) error
	List(limit, offset int) ([]models.User, error)
	ListByRole(role string) ([]models.User, error)
	ListAll(limit, offset int) ([]models.User, error)
	UpdateRole(id uint, role string) error
	UpdateActive(id uint, active bool) error
	IncrementTokenVersion(id uint) error
	GetTokenVersion(id uint) (uint, error)
	Count() (int64, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) GetByID(id uint) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByEmail(email string) (*models.User, error) {
	var user models.User
	email = strings.TrimSpace(email)
	err := r.db.Where("LOWER(email) = LOWER(?)", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) UpdateLastLogin(id uint) error {
	now := time.Now()
	return r.db.Model(&models.User{}).Where("id = ?", id).Update("last_login_at", now).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&models.User{}, id).Error
}

func (r *userRepository) List(limit, offset int) ([]models.User, error) {
	var users []models.User
	err := r.db.Order("created_at DESC").Limit(limit).Offset(offset).Find(&users).Error
	return users, err
}

func (r *userRepository) ListByRole(role string) ([]models.User, error) {
	var users []models.User
	err := r.db.Where("role = ?", role).Find(&users).Error
	return users, err
}

func (r *userRepository) ListAll(limit, offset int) ([]models.User, error) {
	var users []models.User
	q := r.db.Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	return users, q.Find(&users).Error
}

func (r *userRepository) UpdateRole(id uint, role string) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Update("role", role).Error
}

func (r *userRepository) UpdateActive(id uint, active bool) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).Update("is_active", active).Error
}

func (r *userRepository) IncrementTokenVersion(id uint) error {
	return r.db.Model(&models.User{}).Where("id = ?", id).
		UpdateColumn("token_version", gorm.Expr("token_version + 1")).Error
}

func (r *userRepository) GetTokenVersion(id uint) (uint, error) {
	var v uint
	err := r.db.Model(&models.User{}).Where("id = ?", id).Select("token_version").Scan(&v).Error
	return v, err
}

func (r *userRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.User{}).Count(&count).Error
	return count, err
}
